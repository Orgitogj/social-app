import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchConversation, fetchConversations, fetchMessage, fetchMessages, hideMessageForMe, markConversationDelivered, markConversationRead, removeMessageUpload, sendMessage, setMessageReaction, deleteMessageForEveryone, type MessagePage, type SendMessageInput } from '@/services/chatService';
import type { Conversation, Message, MessageStatus } from '@/types/domain';

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
  unreadMessages: ['chat', 'unreadMessages'] as const,
};

type ConversationPage = { items: Conversation[]; nextCursor: { created_at: string; id: string } | null };
type PresenceState = { online: boolean; typing: boolean };

function messageSort(a: Message, b: Message) {
  return b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);
}

export function upsertMessage(data: InfiniteData<MessagePage> | undefined, message: Message): InfiniteData<MessagePage> | undefined {
  if (!data) return data;
  let replaced = false;
  const pages = data.pages.map(page => ({
    ...page,
    items: page.items.map(existing => {
      const sameServerMessage = existing.id === message.id;
      const sameOptimisticMessage = Boolean(message.client_id && existing.client_id === message.client_id);
      if (!sameServerMessage && !sameOptimisticMessage) return existing;
      replaced = true;
      return message;
    }),
  }));
  if (!replaced && pages[0]) pages[0] = { ...pages[0], items: [message, ...pages[0].items].sort(messageSort) };
  return { ...data, pages };
}

function changeMessageStatus(data: InfiniteData<MessagePage> | undefined, clientId: string, status: MessageStatus): InfiniteData<MessagePage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map(page => ({ ...page, items: page.items.map(message => message.client_id === clientId || message.id === clientId ? { ...message, status } : message) })),
  };
}

function removeMessage(data: InfiniteData<MessagePage> | undefined, messageId: string): InfiniteData<MessagePage> | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map(page => ({ ...page, items: page.items.filter(message => message.id !== messageId) })) };
}

function upsertConversation(data: InfiniteData<ConversationPage> | undefined, conversation: Conversation): InfiniteData<ConversationPage> | undefined {
  if (!data) return data;
  let found = false;
  const all = data.pages.flatMap(page => page.items).map(item => {
    if (item.id !== conversation.id) return item;
    found = true;
    return conversation;
  });
  if (!found) all.unshift(conversation);
  const sorted = all.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id));
  return { ...data, pages: [{ items: sorted, nextCursor: data.pages[0]?.nextCursor ?? null }] };
}

function updateReceiptStatuses(data: InfiniteData<MessagePage> | undefined, member: { userId?: string; last_read_at?: string | null; last_delivered_at?: string | null }, currentUserId: string): InfiniteData<MessagePage> | undefined {
  if (!data || member.userId === currentUserId) return data;
  const readAt = member.last_read_at ? new Date(member.last_read_at).getTime() : 0;
  const deliveredAt = member.last_delivered_at ? new Date(member.last_delivered_at).getTime() : 0;
  return {
    ...data,
    pages: data.pages.map(page => ({
      ...page,
      items: page.items.map(message => {
        if (message.userId !== currentUserId || message.status === 'failed' || message.status === 'sending') return message;
        const createdAt = new Date(message.created_at).getTime();
        const status: MessageStatus = readAt >= createdAt ? 'read' : deliveredAt >= createdAt ? 'delivered' : 'sent';
        return status === message.status ? message : { ...message, status };
      }),
    })),
  };
}

export function useConversations(userId?: string) {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: chatKeys.conversations,
    enabled: Boolean(userId),
    initialPageParam: null as { created_at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      const result = await fetchConversations(pageParam);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    getNextPageParam: page => page.nextCursor,
  });

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`chat-inbox:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        const record = payload.new as { conversation_id?: string };
        const conversationId = record.conversation_id ?? (payload.old as { conversation_id?: string }).conversation_id;
        if (!conversationId) return;
        void fetchConversation(conversationId).then(result => {
          if (result.success) client.setQueryData<InfiniteData<ConversationPage>>(chatKeys.conversations, current => upsertConversation(current, result.data));
        });
        void client.invalidateQueries({ queryKey: chatKeys.unreadMessages, exact: true });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `userId=eq.${userId}` }, () => {
        void client.invalidateQueries({ queryKey: chatKeys.conversations, exact: true });
        void client.invalidateQueries({ queryKey: chatKeys.unreadMessages, exact: true });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client, userId]));

  const conversations = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data]);
  return { ...query, conversations };
}

export function useUnreadMessageCount(userId?: string) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: chatKeys.unreadMessages,
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('message_unread_count');
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`chat-unread:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void client.invalidateQueries({ queryKey: chatKeys.unreadMessages, exact: true }); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `userId=eq.${userId}` }, () => { void client.invalidateQueries({ queryKey: chatKeys.unreadMessages, exact: true }); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client, userId]));
  return query;
}

export function useConversation(conversationId: string | undefined, currentUserId: string | undefined) {
  const client = useQueryClient();
  const [presence, setPresence] = useState<PresenceState>({ online: false, typing: false });
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingLastSent = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const receiptTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId ?? 'missing'),
    enabled: Boolean(conversationId && currentUserId),
    initialPageParam: null as { created_at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      if (!conversationId) throw new Error('Conversation unavailable');
      const result = await fetchMessages(conversationId, pageParam);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    getNextPageParam: page => page.nextCursor,
  });

  const messages = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.slice().reverse().flatMap(page => page.items.slice().reverse());
  }, [query.data]);

  const writeReadReceipt = useCallback((messageId: string) => {
    if (!conversationId) return;
    if (receiptTimeout.current) clearTimeout(receiptTimeout.current);
    receiptTimeout.current = setTimeout(() => {
      void markConversationDelivered(conversationId, messageId);
      receiptTimeout.current = setTimeout(() => {
        receiptTimeout.current = null;
        void markConversationRead(conversationId, messageId).then(result => {
          if (result.success) {
            void client.invalidateQueries({ queryKey: chatKeys.conversations, exact: true });
            void client.invalidateQueries({ queryKey: chatKeys.unreadMessages, exact: true });
          }
        });
      }, 800);
    }, 600);
  }, [client, conversationId]);

  useEffect(() => {
    if (!currentUserId) return;
    const latestIncoming = [...messages].reverse().find(message => message.userId !== currentUserId && !message.deleted_at);
    if (latestIncoming) writeReadReceipt(latestIncoming.id);
  }, [currentUserId, messages, writeReadReceipt]);

  useFocusEffect(useCallback(() => {
    if (!conversationId || !currentUserId) return;
    const topic = `conversation:${conversationId}`;
    const channel = supabase
      .channel(topic, { config: { presence: { key: currentUserId } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
        const incoming = payload.new as { id?: string };
        const messageId = incoming.id ?? (payload.old as { id?: string }).id;
        if (!messageId) return;
        void fetchMessage(messageId).then(result => {
          if (result.success) client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => upsertMessage(current, result.data));
          else if (payload.eventType === 'DELETE') client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => removeMessage(current, messageId));
        });
        void client.invalidateQueries({ queryKey: chatKeys.conversations, exact: true });
        void client.invalidateQueries({ queryKey: chatKeys.unreadMessages, exact: true });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `conversation_id=eq.${conversationId}` }, payload => {
        const member = payload.new as { userId?: string; last_read_at?: string | null; last_delivered_at?: string | null };
        client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => updateReceiptStatuses(current, member, currentUserId));
        void client.invalidateQueries({ queryKey: chatKeys.conversations, exact: true });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, payload => {
        const messageId = (payload.new as { message_id?: string }).message_id ?? (payload.old as { message_id?: string }).message_id;
        if (!messageId) return;
        const cached = client.getQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId));
        if (!cached?.pages.some(page => page.items.some(message => message.id === messageId))) return;
        void fetchMessage(messageId).then(result => {
          if (result.success) client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => upsertMessage(current, result.data));
        });
      })
      .on('broadcast', { event: 'typing' }, event => {
        const payload = event.payload as { userId?: string; active?: boolean };
        if (payload.userId !== currentUserId) {
          setPresence(previous => ({ ...previous, typing: payload.active === true }));
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          if (payload.active) typingTimeout.current = setTimeout(() => setPresence(previous => ({ ...previous, typing: false })), 3_500);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ userId?: string }>();
        const peerOnline = Object.values(state).flat().some(member => member.userId !== currentUserId);
        setPresence(previous => ({ ...previous, online: peerOnline }));
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') void channel.track({ userId: currentUserId, onlineAt: new Date().toISOString() });
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (receiptTimeout.current) clearTimeout(receiptTimeout.current);
      setPresence({ online: false, typing: false });
      void supabase.removeChannel(channel);
    };
  }, [client, conversationId, currentUserId]));

  const mutation = useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const result = await sendMessage(input);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onMutate: async input => {
      if (!conversationId || !currentUserId) return undefined;
      await client.cancelQueries({ queryKey: chatKeys.messages(conversationId) });
      const optimistic: Message = {
        id: input.clientId,
        client_id: input.clientId,
        conversation_id: input.conversationId,
        userId: currentUserId,
        text: input.text,
        message_type: input.mediaPath ? 'image' : 'text',
        media_path: input.mediaPath ?? null,
        mime_type: input.mimeType ?? null,
        created_at: new Date().toISOString(),
        status: 'sending',
        reply_to: input.replyToMessageId ? messages.find(message => message.id === input.replyToMessageId) ?? null : null,
        reactions: [],
      };
      client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => upsertMessage(current, optimistic));
      return { input };
    },
    onSuccess: message => {
      if (conversationId) {
        client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => upsertMessage(current, message));
        void client.invalidateQueries({ queryKey: chatKeys.conversations, exact: true });
      }
    },
    onError: (_error, input) => {
      if (conversationId) client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => changeMessageStatus(current, input.clientId, 'failed'));
    },
  });

  const send = useCallback(async (input: Omit<SendMessageInput, 'clientId' | 'conversationId'> & { clientId?: string }) => {
    if (!conversationId) return false;
    try {
      await mutation.mutateAsync({ ...input, clientId: input.clientId ?? crypto.randomUUID(), conversationId });
      return true;
    } catch {
      return false;
    }
  }, [conversationId, mutation]);

  const setTyping = useCallback((active: boolean) => {
    const channel = channelRef.current;
    if (!channel || !currentUserId) return;
    const now = Date.now();
    if (active && now - typingLastSent.current < 1_500) return;
    typingLastSent.current = now;
    void channel.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId, active } });
  }, [currentUserId]);

  const react = useCallback(async (messageId: string, reaction: string) => {
    const result = await setMessageReaction(messageId, reaction);
    if (result.success && conversationId) client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => upsertMessage(current, result.data));
    return result;
  }, [client, conversationId]);

  const hide = useCallback(async (messageId: string) => {
    const cached = conversationId ? client.getQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId)) : undefined;
    const failedMessage = cached?.pages.flatMap(page => page.items).find(message => message.id === messageId && message.status === 'failed');
    if (failedMessage && conversationId) {
      client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => removeMessage(current, messageId));
      if (failedMessage.media_path) void removeMessageUpload(failedMessage.media_path);
      return { success: true as const, data: undefined };
    }
    const result = await hideMessageForMe(messageId);
    if (result.success && conversationId) client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => removeMessage(current, messageId));
    return result;
  }, [client, conversationId]);

  const deleteForEveryone = useCallback(async (messageId: string) => {
    const result = await deleteMessageForEveryone(messageId);
    if (result.success && conversationId) client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), current => upsertMessage(current, result.data));
    return result;
  }, [client, conversationId]);

  return { ...query, messages, presence, send, retry: (message: Message) => { void send({ clientId: message.client_id ?? message.id, text: message.text, mediaPath: message.media_path, mimeType: message.mime_type, replyToMessageId: message.reply_to?.id }); }, setTyping, react, hide, deleteForEveryone };
}

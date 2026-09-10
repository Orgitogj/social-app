import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ScreenWrapper from '@/components/screenWrapper';
import BackButton from '@/components/BackButton';
import Avatar from '@/components/Avatar';
import Loading from '@/components/Loading';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { formatChatDate, isNewDate } from '@/helpers/chat';
import { useAuth } from '@/contexts/AuthContexts';
import { fetchConversation } from '@/services/chatService';
import { useConversation } from '@/hooks/useChat';
import type { Message, MessageReplyPreview } from '@/types/domain';
import { theme } from '@/constants/theme';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

function replyPreview(message: Message): MessageReplyPreview {
  return { id: message.id, userId: message.userId, text: message.text, message_type: message.message_type, media_path: message.media_path, deleted_at: message.deleted_at };
}

export default function Chat() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const listRef = useRef<FlatList<Message>>(null);
  const didInitialScroll = useRef(false);
  const newestMessageId = useRef<string | undefined>(undefined);
  const [selected, setSelected] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<MessageReplyPreview | null>(null);
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    enabled: Boolean(conversationId),
    queryFn: async () => {
      if (!conversationId) throw new Error('Conversation unavailable');
      const result = await fetchConversation(conversationId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
  const chat = useConversation(conversationId, user?.id);

  useEffect(() => {
    if (!didInitialScroll.current && chat.messages.length) {
      didInitialScroll.current = true;
      newestMessageId.current = chat.messages.at(-1)?.id;
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [chat.messages.length]);

  useEffect(() => {
    const newest = chat.messages.at(-1)?.id;
    if (!newest || !didInitialScroll.current || newest === newestMessageId.current) return;
    newestMessageId.current = newest;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [chat.messages]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y < 60 && chat.hasNextPage && !chat.isFetchingNextPage) void chat.fetchNextPage();
  }, [chat]);

  const closeActions = () => setSelected(null);
  const copyMessage = async () => {
    if (selected?.text) await Clipboard.setStringAsync(selected.text);
    closeActions();
  };
  const react = async (emoji: string) => {
    if (selected) await chat.react(selected.id, emoji);
    closeActions();
  };
  const beginReply = () => {
    if (selected) setReplyTo(replyPreview(selected));
    closeActions();
  };
  const hideForMe = () => {
    if (!selected) return;
    const target = selected.id;
    closeActions();
    Alert.alert('Delete for me?', 'This removes the message only from your inbox.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void chat.hide(target); } },
    ]);
  };
  const deleteForEveryone = () => {
    if (!selected) return;
    const target = selected.id;
    closeActions();
    Alert.alert('Delete for everyone?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void chat.deleteForEveryone(target); } },
    ]);
  };

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const previous = chat.messages[index - 1];
    const mine = item.userId === user?.id;
    const label = item.reply_to?.userId === user?.id ? 'You' : conversation?.other_user?.name ?? 'Reply';
    return <>
      {isNewDate(previous?.created_at, item.created_at) ? <View style={styles.date}><Text style={styles.dateText}>{formatChatDate(item.created_at)}</Text></View> : null}
      <MessageBubble message={item} mine={mine} replyLabel={label} onLongPress={setSelected} onReaction={emoji => { void chat.react(item.id, emoji); }} onRetry={chat.retry} />
    </>;
  }, [chat, conversation?.other_user?.name, user?.id]);

  const status = useMemo(() => chat.presence.typing ? `${conversation?.other_user?.name ?? 'Someone'} is typing…` : chat.presence.online ? 'Online' : '', [chat.presence, conversation?.other_user?.name]);

  if (!conversationId || (!conversation && conversationLoading)) return <ScreenWrapper bg="white"><View style={styles.center}><Loading /></View></ScreenWrapper>;
  if (!conversation || !user) return <ScreenWrapper bg="white"><View style={styles.center}><Text style={styles.unavailable}>This conversation is unavailable.</Text></View></ScreenWrapper>;

  return <ScreenWrapper bg="white">
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <View style={styles.header}>
        <BackButton />
        <Avatar uri={conversation.other_user?.image} size={38} rounded={19} />
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>{conversation.other_user?.name ?? 'Chat'}</Text>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={chat.messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        contentContainerStyle={styles.messages}
        ListHeaderComponent={chat.isFetchingNextPage ? <View style={styles.topLoading}><Loading size="small" /></View> : null}
        ListEmptyComponent={chat.isLoading ? <View style={styles.center}><Loading /></View> : <Text style={styles.empty}>Start the conversation.</Text>}
      />
      <MessageComposer userId={user.id} replyTo={replyTo} replyLabel={`Replying to ${replyTo?.userId === user.id ? 'yourself' : conversation.other_user?.name ?? 'message'}`} onCancelReply={() => setReplyTo(null)} onTyping={chat.setTyping} onSend={chat.send} />
    </KeyboardAvoidingView>
    <Modal transparent visible={Boolean(selected)} animationType="fade" onRequestClose={closeActions}>
      <Pressable style={styles.backdrop} onPress={closeActions}>
        <Pressable style={styles.actionSheet} onPress={event => event.stopPropagation()}>
          <View style={styles.reactions}>{REACTIONS.map(emoji => <Pressable key={emoji} onPress={() => { void react(emoji); }} style={styles.emoji}><Text style={styles.emojiText}>{emoji}</Text></Pressable>)}</View>
          <Pressable style={styles.action} onPress={beginReply}><Text style={styles.actionText}>Reply</Text></Pressable>
          {selected?.text ? <Pressable style={styles.action} onPress={() => { void copyMessage(); }}><Text style={styles.actionText}>Copy text</Text></Pressable> : null}
          <Pressable style={styles.action} onPress={hideForMe}><Text style={styles.actionText}>Delete for me</Text></Pressable>
          {selected?.userId === user.id ? <Pressable style={styles.action} onPress={deleteForEveryone}><Text style={styles.destructive}>Delete for everyone</Text></Pressable> : null}
        </Pressable>
      </Pressable>
    </Modal>
  </ScreenWrapper>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unavailable: { color: theme.colors.textLight, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.gray },
  headerText: { flex: 1, minWidth: 0 },
  name: { color: theme.colors.textDark, fontSize: 17, fontWeight: theme.fonts.semibold as '600' },
  status: { color: theme.colors.primaryDark, fontSize: 12, marginTop: 1 },
  messages: { paddingHorizontal: 12, paddingVertical: 9, flexGrow: 1 },
  date: { alignItems: 'center', marginVertical: 11 },
  dateText: { color: theme.colors.textLight, backgroundColor: '#f4f4f5', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  empty: { alignSelf: 'center', marginTop: 30, color: theme.colors.textLight },
  topLoading: { height: 34, justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  actionSheet: { backgroundColor: 'white', borderTopLeftRadius: theme.radius.xxl, borderTopRightRadius: theme.radius.xxl, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28 },
  reactions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  emoji: { padding: 8 },
  emojiText: { fontSize: 26 },
  action: { paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.gray },
  actionText: { color: theme.colors.textDark, fontSize: 16 },
  destructive: { color: theme.colors.rose, fontSize: 16, fontWeight: theme.fonts.semibold as '600' },
});

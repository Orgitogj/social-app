import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { deduplicate, type Cursor } from '@/helpers/pagination';
import { messageInputSchema, messageReactionSchema, uuidSchema } from '@/helpers/validation';
import { uploadFile } from '@/services/imageService';
import type { Conversation, Message, MessageReaction, MessageReplyPreview, MessageStatus, MessageType } from '@/types/domain';
import { toServiceError, type ServiceResult } from '@/types/result';

export const CHAT_PAGE_SIZE = 30;

export type MessagePage = { items: Message[]; nextCursor: Cursor | null };
export type SendMessageInput = { clientId: string; conversationId: string; text: string; mediaPath?: string | null; mimeType?: string | null; replyToMessageId?: string | null };

type MessageRecord = {
  id: string;
  client_id?: string | null;
  conversation_id: string;
  userId: string;
  text: string;
  message_type: MessageType;
  media_path?: string | null;
  mime_type?: string | null;
  created_at: string;
  deleted_at?: string | null;
  deleted_by_sender?: boolean;
  status?: MessageStatus;
  reply_to?: MessageReplyPreview | null;
  reactions?: MessageReaction[];
};

function isMessageType(value: unknown): value is MessageType {
  return value === 'text' || value === 'image' || value === 'video' || value === 'audio' || value === 'file' || value === 'location';
}

function isMessageStatus(value: unknown): value is MessageStatus {
  return value === 'sending' || value === 'sent' || value === 'delivered' || value === 'read' || value === 'failed';
}

function parseReply(value: unknown): MessageReplyPreview | null {
  if (!value || typeof value !== 'object') return null;
  const reply = value as Record<string, unknown>;
  if (typeof reply.id !== 'string' || typeof reply.userId !== 'string' || typeof reply.text !== 'string' || !isMessageType(reply.message_type)) return null;
  return {
    id: reply.id,
    userId: reply.userId,
    text: reply.text,
    message_type: reply.message_type,
    media_path: typeof reply.media_path === 'string' ? reply.media_path : null,
    deleted_at: typeof reply.deleted_at === 'string' ? reply.deleted_at : null,
  };
}

function parseReactions(value: unknown): MessageReaction[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const reaction = item as Record<string, unknown>;
    if (typeof reaction.emoji !== 'string' || typeof reaction.count !== 'number' || typeof reaction.reacted_by_me !== 'boolean') return [];
    return [{ emoji: reaction.emoji, count: reaction.count, reacted_by_me: reaction.reacted_by_me }];
  });
}

export function parseMessage(value: unknown): Message | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as MessageRecord;
  if (typeof message.id !== 'string' || typeof message.conversation_id !== 'string' || typeof message.userId !== 'string' || typeof message.text !== 'string' || typeof message.created_at !== 'string' || !isMessageType(message.message_type)) return null;
  return {
    id: message.id,
    client_id: typeof message.client_id === 'string' ? message.client_id : null,
    conversation_id: message.conversation_id,
    userId: message.userId,
    text: message.text,
    message_type: message.message_type,
    media_path: typeof message.media_path === 'string' ? message.media_path : null,
    mime_type: typeof message.mime_type === 'string' ? message.mime_type : null,
    created_at: message.created_at,
    deleted_at: typeof message.deleted_at === 'string' ? message.deleted_at : null,
    deleted_by_sender: message.deleted_by_sender === true,
    status: isMessageStatus(message.status) ? message.status : 'sent',
    reply_to: parseReply(message.reply_to),
    reactions: parseReactions(message.reactions),
  };
}

function parseMessages(values: unknown[]): Message[] {
  const messages: Message[] = [];
  values.forEach(value => {
    const message = parseMessage(value);
    if (message) messages.push(message);
  });
  return messages;
}

function parseConversation(value: unknown): Conversation | null {
  if (!value || typeof value !== 'object') return null;
  const conversation = value as Record<string, unknown>;
  if (typeof conversation.id !== 'string' || typeof conversation.user_low !== 'string' || typeof conversation.user_high !== 'string' || typeof conversation.created_at !== 'string' || typeof conversation.updated_at !== 'string') return null;
  const other = conversation.other_user;
  const other_user = other && typeof other === 'object' && typeof (other as Record<string, unknown>).id === 'string' && typeof (other as Record<string, unknown>).name === 'string'
    ? {
        id: (other as Record<string, unknown>).id as string,
        name: (other as Record<string, unknown>).name as string,
        username: typeof (other as Record<string, unknown>).username === 'string' ? (other as Record<string, unknown>).username as string : null,
        image: typeof (other as Record<string, unknown>).image === 'string' ? (other as Record<string, unknown>).image as string : null,
      }
    : undefined;
  return {
    id: conversation.id,
    user_low: conversation.user_low,
    user_high: conversation.user_high,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    other_user,
    latest_message: parseMessage(conversation.latest_message),
    unread_count: typeof conversation.unread_count === 'number' ? conversation.unread_count : 0,
  };
}

function parseConversations(values: unknown[]): Conversation[] {
  const conversations: Conversation[] = [];
  values.forEach(value => {
    const conversation = parseConversation(value);
    if (conversation) conversations.push(conversation);
  });
  return conversations;
}

function resultFromError(error: unknown): ServiceResult<never> {
  return { success: false, error: toServiceError(error) };
}

export async function fetchMessages(conversationId: string, cursor?: Cursor | null): Promise<ServiceResult<MessagePage>> {
  const parsedId = uuidSchema.safeParse(conversationId);
  if (!parsedId.success) return resultFromError(parsedId.error);
  const { data, error } = await supabase.rpc('get_messages', {
    p_conversation_id: parsedId.data,
    p_before_time: cursor?.created_at ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: CHAT_PAGE_SIZE,
  });
  if (error) return resultFromError(error);
  const items = deduplicate(parseMessages(data ?? []));
  const last = items.at(-1);
  return { success: true, data: { items, nextCursor: items.length === CHAT_PAGE_SIZE && last ? { created_at: last.created_at, id: last.id } : null } };
}

export async function fetchMessage(messageId: string): Promise<ServiceResult<Message>> {
  const parsedId = uuidSchema.safeParse(messageId);
  if (!parsedId.success) return resultFromError(parsedId.error);
  const { data, error } = await supabase.rpc('get_message', { p_message_id: parsedId.data });
  if (error) return resultFromError(error);
  const message = parseMessage(data);
  return message ? { success: true, data: message } : { success: false, error: { code: 'notFound', message: 'Message unavailable', retryable: false } };
}

export async function fetchConversations(cursor?: Cursor | null): Promise<ServiceResult<{ items: Conversation[]; nextCursor: Cursor | null }>> {
  const { data, error } = await supabase.rpc('get_conversations', {
    p_before_time: cursor?.created_at ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: 30,
  });
  if (error) return resultFromError(error);
  const items = deduplicate(parseConversations(data ?? []));
  const last = items.at(-1);
  return { success: true, data: { items, nextCursor: items.length === 30 && last ? { created_at: last.updated_at, id: last.id } : null } };
}

export async function fetchConversation(conversationId: string): Promise<ServiceResult<Conversation>> {
  const parsedId = uuidSchema.safeParse(conversationId);
  if (!parsedId.success) return resultFromError(parsedId.error);
  const { data, error } = await supabase.rpc('get_conversation', { p_conversation_id: parsedId.data });
  if (error) return resultFromError(error);
  const conversation = parseConversation(data);
  if (!conversation) return { success: false, error: { code: 'notFound', message: 'Conversation unavailable', retryable: false } };
  return { success: true, data: conversation };
}

export async function startConversation(otherUserId: string): Promise<ServiceResult<string>> {
  const parsedId = uuidSchema.safeParse(otherUserId);
  if (!parsedId.success) return resultFromError(parsedId.error);
  const { data, error } = await supabase.rpc('start_conversation', { other_user: parsedId.data });
  return error || !data ? resultFromError(error ?? new Error('Conversation unavailable')) : { success: true, data };
}

export async function sendMessage(input: SendMessageInput): Promise<ServiceResult<Message>> {
  const parsed = messageInputSchema.safeParse(input);
  if (!parsed.success) return resultFromError(parsed.error);
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: parsed.data.conversationId,
    p_client_id: parsed.data.clientId,
    p_text: parsed.data.text,
    p_media_path: parsed.data.mediaPath ?? null,
    p_mime_type: parsed.data.mimeType ?? null,
    p_reply_to_message_id: parsed.data.replyToMessageId ?? null,
  });
  if (error) return resultFromError(error);
  const message = parseMessage(data);
  return message ? { success: true, data: message } : { success: false, error: { code: 'invalidData', message: 'Invalid message response', retryable: false } };
}

export async function markConversationRead(conversationId: string, messageId: string): Promise<ServiceResult<void>> {
  const ids = uuidSchema.safeParse(conversationId).success && uuidSchema.safeParse(messageId).success;
  if (!ids) return { success: false, error: { code: 'invalidData', message: 'Invalid conversation', retryable: false } };
  const { error } = await supabase.rpc('mark_conversation_read', { target: conversationId, through_message: messageId });
  return error ? resultFromError(error) : { success: true, data: undefined };
}

export async function markConversationDelivered(conversationId: string, messageId: string): Promise<ServiceResult<void>> {
  const ids = uuidSchema.safeParse(conversationId).success && uuidSchema.safeParse(messageId).success;
  if (!ids) return { success: false, error: { code: 'invalidData', message: 'Invalid conversation', retryable: false } };
  const { error } = await supabase.rpc('mark_conversation_delivered', { target: conversationId, through_message: messageId });
  return error ? resultFromError(error) : { success: true, data: undefined };
}

export async function setMessageReaction(messageId: string, reaction: string): Promise<ServiceResult<Message>> {
  const parsedId = uuidSchema.safeParse(messageId);
  const parsedReaction = messageReactionSchema.safeParse(reaction);
  if (!parsedId.success || !parsedReaction.success) return { success: false, error: { code: 'invalidData', message: 'Invalid reaction', retryable: false } };
  const { data, error } = await supabase.rpc('set_message_reaction', { p_message_id: parsedId.data, p_reaction: parsedReaction.data });
  if (error) return resultFromError(error);
  const message = parseMessage(data);
  return message ? { success: true, data: message } : { success: false, error: { code: 'invalidData', message: 'Invalid message response', retryable: false } };
}

export async function hideMessageForMe(messageId: string): Promise<ServiceResult<void>> {
  const parsedId = uuidSchema.safeParse(messageId);
  if (!parsedId.success) return resultFromError(parsedId.error);
  const { error } = await supabase.rpc('hide_message_for_me', { p_message_id: parsedId.data });
  return error ? resultFromError(error) : { success: true, data: undefined };
}

export async function deleteMessageForEveryone(messageId: string): Promise<ServiceResult<Message>> {
  const parsedId = uuidSchema.safeParse(messageId);
  if (!parsedId.success) return resultFromError(parsedId.error);
  const { data, error } = await supabase.rpc('delete_message_for_everyone', { p_message_id: parsedId.data });
  if (error) return resultFromError(error);
  const message = parseMessage(data);
  return message ? { success: true, data: message } : { success: false, error: { code: 'invalidData', message: 'Invalid message response', retryable: false } };
}

export async function uploadMessageImage(userId: string, uri: string): Promise<ServiceResult<{ path: string; mimeType: 'image/jpeg' }>> {
  const parsedUser = uuidSchema.safeParse(userId);
  if (!parsedUser.success || !uri) return { success: false, error: { code: 'invalidData', message: 'Invalid image', retryable: false } };
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: 1600, height: null });
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.78, format: ImageManipulator.SaveFormat.JPEG });
    const upload = await uploadFile(parsedUser.data, result.uri, 'image/jpeg');
    return upload.success && upload.data
      ? { success: true, data: { path: upload.data, mimeType: 'image/jpeg' } }
      : { success: false, error: { code: 'networkError', message: upload.msg ?? 'Image upload failed', retryable: true } };
  } catch (error) {
    return resultFromError(error);
  }
}

export async function removeMessageUpload(path: string): Promise<void> {
  if (!path) return;
  await supabase.storage.from('uploads').remove([path]);
}

export async function getMessageMediaUrl(path: string): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.storage.from('uploads').createSignedUrl(path, 60 * 60);
  return error || !data?.signedUrl
    ? { success: false, error: { code: 'networkError', message: 'Image unavailable', retryable: true } }
    : { success: true, data: data.signedUrl };
}

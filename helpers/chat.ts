import type { MessageType } from '@/types/domain';

export function formatChatDate(value: string, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const difference = Math.round((today - target) / 86_400_000);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Yesterday';
  if (difference < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(date);
}

export function formatMessageTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function isNewDate(previous: string | undefined, current: string) {
  if (!previous) return true;
  const before = new Date(previous);
  const now = new Date(current);
  return before.getFullYear() !== now.getFullYear() || before.getMonth() !== now.getMonth() || before.getDate() !== now.getDate();
}

type PreviewSource = { text: string; message_type: MessageType; deleted_at?: string | null };

export function storyMessageLabel(messageType: MessageType, text: string, mine: boolean) {
  if (messageType === 'story_reaction') return mine ? `You reacted ${text} to their story` : `Reacted ${text} to your story`;
  if (messageType === 'story_reply') return mine ? 'You replied to their story' : 'Replied to your story';
  return '';
}

export function messagePreviewText(message: PreviewSource | null | undefined, mine?: boolean) {
  if (!message) return 'No messages yet';
  if (message.deleted_at) return 'This message was deleted';
  if (message.message_type === 'story_reaction') return mine === undefined ? `Story reaction ${message.text}` : storyMessageLabel(message.message_type, message.text, mine);
  if (message.message_type === 'story_reply') return mine === undefined ? `Story reply: ${message.text}` : `${storyMessageLabel(message.message_type, message.text, mine)}: ${message.text}`;
  return message.text || (message.message_type === 'image' ? 'Photo' : 'Message');
}

import { formatChatDate, formatMessageTime, isNewDate } from '@/helpers/chat';
import { destinationFromNotification, destinationFromUrl } from '@/lib/deepLinking';

const userId = 'a49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const postId = 'b49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const conversationId = 'c49d3be3-82e9-4a96-ae64-a868d7ddc2a4';

describe('chat dates and safe deep links', () => {
  it('groups messages into useful date labels', () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    expect(formatChatDate('2026-09-10T08:00:00.000Z', now)).toBe('Today');
    expect(formatChatDate('2026-09-09T08:00:00.000Z', now)).toBe('Yesterday');
    expect(isNewDate('2026-09-09T10:00:00', '2026-09-10T10:00:00')).toBe(true);
    expect(formatMessageTime('not-a-date')).toBe('');
  });

  it('accepts only known, UUID-backed app destinations', () => {
    expect(destinationFromUrl(`supasocialapp://profile/${userId}`)).toEqual({ kind: 'profile', userId });
    expect(destinationFromUrl(`supasocialapp://post/${postId}`)).toEqual({ kind: 'post', postId });
    expect(destinationFromUrl(`supasocialapp://chat/${conversationId}`)).toEqual({ kind: 'chat', conversationId });
    expect(destinationFromUrl('supasocialapp://chat/not-a-uuid')).toBeNull();
    expect(destinationFromUrl('https://untrusted.example/chat/' + conversationId)).toBeNull();
  });

  it('validates notification routes before navigation', () => {
    expect(destinationFromNotification({ type: 'message', conversationId })).toEqual({ kind: 'chat', conversationId });
    expect(destinationFromNotification({ type: 'like', postId })).toEqual({ kind: 'post', postId });
    expect(destinationFromNotification({ type: 'follow', userId })).toEqual({ kind: 'profile', userId });
    expect(destinationFromNotification({ type: 'message', conversationId: 'bad' })).toBeNull();
    expect(destinationFromNotification({ type: 'message', postId })).toBeNull();
  });
});

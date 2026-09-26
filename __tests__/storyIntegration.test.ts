import { channelFor, notificationBody } from '@/supabase/functions/dispatch-push/format';
import { claimedPaths, isSafeCleanupPath, partitionRemoval } from '@/supabase/functions/storage-cleanup/paths';
import { destinationFromNotification, destinationFromUrl, destinationHref, storePendingDestination, takePendingDestination } from '@/lib/deepLinking';
import { nextTrayExpiry, orderStoryTray, storyListRingState } from '@/helpers/stories';
import { fetchStory, parseStoryTrayItem, setStoryMute } from '@/services/storyService';
import { initialStoryState, viewerAuthors } from '@/hooks/useStoryViewer';
import { profileStoryAction } from '@/components/stories/ProfileStoryAvatar';
import type { StoryTrayItem } from '@/types/domain';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
jest.mock('@/services/imageService', () => ({ uploadFileWithProgress: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const storyId = 'c49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const authorId = 'a49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const otherId = 'b49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const now = Date.parse('2026-09-25T12:00:00Z');

const tray = (id: string, overrides: Partial<StoryTrayItem> = {}): StoryTrayItem => ({
  author: { id, name: id, username: null, image: null }, story_count: 1, unviewed_count: 1, latest_story_at: '2026-09-25T10:00:00Z',
  has_close_friends: false, is_own: false, muted: false, next_expires_at: '2026-09-26T10:00:00Z', ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('story push formatting', () => {
  it('labels story mentions and keeps them on the social channel', () => {
    expect(notificationBody({ notification_type: 'story_mention', message_preview: null, message_previews: true })).toBe('mentioned you in their story');
    expect(channelFor('story_mention')).toBe('social-activity');
    expect(channelFor('message')).toBe('messages');
    expect(channelFor('unknown')).toBe('general');
  });

  it('respects message preview preferences for story replies', () => {
    expect(notificationBody({ notification_type: 'message', message_preview: 'Replied to your story: Nice', message_previews: true })).toBe('Replied to your story: Nice');
    expect(notificationBody({ notification_type: 'message', message_preview: 'Replied to your story: Nice', message_previews: false })).toBe('New message');
  });
});

describe('story deep links', () => {
  it('parses the app scheme and validates story ids', () => {
    expect(destinationFromUrl(`supasocialapp://story/${storyId}`)).toEqual({ kind: 'story', storyId });
    expect(destinationFromUrl(`/story/${storyId}?utm=1`)).toEqual({ kind: 'story', storyId });
    expect(destinationFromUrl('supasocialapp://story/not-a-uuid')).toBeNull();
    expect(destinationFromUrl(`supasocialapp://story/${storyId}/extra`)).toBeNull();
    expect(destinationFromUrl(`https://evil.example/story/${storyId}`)).toBeNull();
    expect(destinationFromUrl('supasocialapp://story/..%2F..%2Fsecret')).toBeNull();
  });

  it('routes story mention notifications to the viewer by id only', () => {
    expect(destinationFromNotification({ type: 'story_mention', storyId })).toEqual({ kind: 'story', storyId });
    expect(destinationFromNotification({ type: 'story_mention', storyId: 'bad' })).toBeNull();
    expect(destinationFromNotification({ type: 'story_mention' })).toBeNull();
    expect(destinationHref({ kind: 'story', storyId })).toEqual({ pathname: '/main/storyViewer', params: { storyId } });
  });

  it('keeps a story destination pending through authentication', async () => {
    await storePendingDestination({ kind: 'story', storyId });
    await expect(takePendingDestination()).resolves.toEqual({ kind: 'story', storyId });
    await expect(takePendingDestination()).resolves.toBeNull();
  });

  it('resolves links only through the authorized story query', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(fetchStory(storyId)).resolves.toEqual({ success: true, data: null });
    expect(mockRpc).toHaveBeenCalledWith('get_story', { p_story_id: storyId });
    await expect(fetchStory('../../x')).resolves.toEqual({ success: true, data: null });
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});

describe('deep-linked viewer start', () => {
  it('opens only the linked author and requires the linked story', () => {
    expect(viewerAuthors([tray(otherId), tray(authorId)], authorId, 'author')).toEqual([authorId]);
    expect(viewerAuthors([tray(otherId), tray(authorId)], authorId, 'tray')).toEqual([otherId, authorId]);
    expect(initialStoryState('pending', false, false)).toBe('pending');
    expect(initialStoryState('pending', true, true)).toBe('shown');
    expect(initialStoryState('pending', true, false)).toBe('missing');
    expect(initialStoryState('shown', true, false)).toBe('shown');
  });
});

describe('profile story state', () => {
  const active = { viewed: false, expires_at: '2026-09-26T00:00:00Z' };
  it('derives the ring only from accessible, unexpired stories', () => {
    expect(storyListRingState([], false, now)).toBe('none');
    expect(storyListRingState(undefined, false, now)).toBe('none');
    expect(storyListRingState([{ viewed: false, expires_at: '2026-09-25T11:00:00Z' }], false, now)).toBe('none');
    expect(storyListRingState([active], false, now)).toBe('unviewed');
    expect(storyListRingState([{ ...active, viewed: true }], false, now)).toBe('viewed');
    expect(storyListRingState([{ ...active, viewed: true }], true, now)).toBe('unviewed');
  });

  it('chooses the avatar action for own and other profiles', () => {
    expect(profileStoryAction(true, 'none')).toBe('create');
    expect(profileStoryAction(true, 'unviewed')).toBe('choose');
    expect(profileStoryAction(false, 'viewed')).toBe('view');
    expect(profileStoryAction(false, 'none')).toBe('none');
  });
});

describe('story mute and tray expiry', () => {
  it('parses mute and expiry state and orders muted authors last', () => {
    expect(parseStoryTrayItem({ author: { id: authorId, name: 'A' }, story_count: 1, unviewed_count: 1, latest_story_at: 'x', muted: true, next_expires_at: '2026-09-26T00:00:00Z' })).toMatchObject({ muted: true, next_expires_at: '2026-09-26T00:00:00Z' });
    const ordered = orderStoryTray([tray(authorId, { muted: true, latest_story_at: '2026-09-25T11:59:00Z' }), tray(otherId, { unviewed_count: 0 }), tray('own', { is_own: true, muted: false })]);
    expect(ordered.map(item => item.author.id)).toEqual(['own', otherId, authorId]);
  });

  it('refetches the tray at the next server-reported expiry', () => {
    expect(nextTrayExpiry([tray(authorId, { next_expires_at: '2026-09-25T12:00:30Z' }), tray(otherId)], now)).toBe(31_000);
    expect(nextTrayExpiry([tray(authorId, { next_expires_at: null })], now)).toBeNull();
  });

  it('sets story mute through the shared mute rpc', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(setStoryMute(authorId, true)).resolves.toEqual({ success: true, data: true });
    expect(mockRpc).toHaveBeenCalledWith('set_story_mute', { p_user_id: authorId, p_muted: true });
    await expect(setStoryMute('nope', true)).resolves.toMatchObject({ success: false });
  });
});

describe('storage cleanup safety', () => {
  it('accepts only namespaced object paths', () => {
    expect(isSafeCleanupPath(`${authorId}/stories/${storyId}/media.jpg`)).toBe(true);
    expect(isSafeCleanupPath('../escape.jpg')).toBe(false);
    expect(isSafeCleanupPath(`${authorId}/stories/../../x.jpg`)).toBe(false);
    expect(isSafeCleanupPath(`${authorId}//x.jpg`)).toBe(false);
    expect(isSafeCleanupPath('')).toBe(false);
    expect(isSafeCleanupPath(`/${authorId}/x.jpg`)).toBe(false);
    expect(claimedPaths([{ path: `${authorId}/x.jpg` }, { path: '../y' }, 3])).toEqual([`${authorId}/x.jpg`]);
  });

  it('treats missing objects as removed and retries whole failed batches', () => {
    const paths = [`${authorId}/a.jpg`, `${authorId}/b.jpg`];
    expect(partitionRemoval(paths, [{ name: `${authorId}/a.jpg` }], false)).toEqual({ removed: paths, failed: [], missing: 1 });
    expect(partitionRemoval(paths, null, true)).toEqual({ removed: [], failed: paths, missing: 0 });
  });
});

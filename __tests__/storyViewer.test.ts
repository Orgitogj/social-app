import { createPausableTimer, nextExpiryDelay, nextStep, playableStories, previousStep, resolveStoryIndex, startCursor, storyDurationMs } from '@/helpers/storyViewer';
import type { Story } from '@/types/domain';
import { viewerAuthors } from '@/hooks/useStoryViewer';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/services/imageService', () => ({ uploadFileWithProgress: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));

const now = Date.parse('2026-09-24T12:00:00Z');
const alice = 'a0000000-0000-4000-8000-000000000002';
const john = 'a0000000-0000-4000-8000-000000000003';

const story = (id: string, overrides: Partial<Story> = {}): Story => ({
  id, author_id: alice, media_type: 'image', media_path: `${alice}/stories/${id}/media.jpg`, mime_type: 'image/jpeg', width: 1, height: 1,
  audience: 'followers', created_at: '2026-09-24T10:00:00Z', expires_at: '2026-09-25T10:00:00Z', viewed: false, ...overrides,
});

const aliceStories = [story('a1', { viewed: true }), story('a2'), story('a3')];

describe('story viewer navigation', () => {
  it('starts at the selected author and their first unviewed story', () => {
    const tray = [alice, john].map(id => ({ author: { id, name: id }, story_count: 1, unviewed_count: 1, latest_story_at: '', has_close_friends: false, is_own: false }));
    expect(viewerAuthors(tray, john)).toEqual([alice, john]);
    expect(viewerAuthors(tray, 'a0000000-0000-4000-8000-000000000009')).toEqual(['a0000000-0000-4000-8000-000000000009']);
    expect(resolveStoryIndex(aliceStories, startCursor(0))).toBe(1);
    expect(resolveStoryIndex(aliceStories.map(item => ({ ...item, viewed: true })), startCursor(0))).toBe(0);
  });

  it('keeps the current story when viewed state changes', () => {
    const cursor = { authorIndex: 0, storyId: 'a2', storyIndex: 1 };
    const updated = aliceStories.map(item => ({ ...item, viewed: true }));
    expect(resolveStoryIndex(updated, cursor)).toBe(1);
  });

  it('moves to the next story, then the next author, then closes', () => {
    const cursor = { authorIndex: 0, storyId: 'a2', storyIndex: 1 };
    expect(nextStep(cursor, aliceStories, 1, 2)).toEqual({ type: 'move', cursor: { authorIndex: 0, storyId: 'a3', storyIndex: 2 } });
    expect(nextStep({ ...cursor, storyId: 'a3', storyIndex: 2 }, aliceStories, 2, 2)).toEqual({ type: 'move', cursor: startCursor(1) });
    expect(nextStep({ authorIndex: 1, storyId: 'j1', storyIndex: 0 }, [story('j1')], 0, 2)).toEqual({ type: 'close' });
  });

  it('moves to the previous story, then the previous author, or restarts', () => {
    expect(previousStep({ authorIndex: 1, storyId: 'j2', storyIndex: 1 }, [story('j1'), story('j2')], 1)).toEqual({ type: 'move', cursor: { authorIndex: 1, storyId: 'j1', storyIndex: 0 } });
    expect(previousStep({ authorIndex: 1, storyId: 'j1', storyIndex: 0 }, [story('j1')], 0)).toEqual({ type: 'move', cursor: startCursor(0) });
    expect(previousStep({ authorIndex: 0, storyId: 'a1', storyIndex: 0 }, aliceStories, 0)).toEqual({ type: 'restart' });
  });
});

describe('inaccessible and expiring stories', () => {
  it('skips expired and unavailable stories', () => {
    const stories = [story('a1', { expires_at: '2026-09-24T11:59:59Z' }), story('a2'), story('a3')];
    expect(playableStories(stories, new Set(['a3']), now).map(item => item.id)).toEqual(['a2']);
    expect(playableStories(undefined, new Set(), now)).toEqual([]);
  });

  it('advances into the slot of a story that disappears while open', () => {
    const cursor = { authorIndex: 0, storyId: 'a2', storyIndex: 1 };
    expect(resolveStoryIndex([story('a1'), story('a3')], cursor)).toBe(1);
    expect(resolveStoryIndex([story('a1')], cursor)).toBeNull();
    expect(nextStep(cursor, [story('a1')], null, 1)).toEqual({ type: 'close' });
    expect(resolveStoryIndex([], cursor)).toBeNull();
  });

  it('schedules a refresh at the next expiry', () => {
    expect(nextExpiryDelay([story('a1', { expires_at: '2026-09-24T12:00:10Z' }), story('a2')], now)).toBe(10_050);
    expect(nextExpiryDelay([story('a1', { expires_at: '2026-09-24T11:00:00Z' })], now)).toBeNull();
  });
});

describe('story timing', () => {
  afterEach(() => jest.useRealTimers());

  it('uses a fixed image duration and the real video duration', () => {
    expect(storyDurationMs(story('a1'), 5000)).toBe(5000);
    expect(storyDurationMs(story('v1', { media_type: 'video', duration: 30 }), 5000, 12.5)).toBe(12_500);
    expect(storyDurationMs(story('v1', { media_type: 'video', duration: 30 }), 5000, 0)).toBeNull();
  });

  it('pauses and resumes without losing elapsed time', () => {
    jest.useFakeTimers({ now });
    const done = jest.fn();
    const timer = createPausableTimer(5000, done);
    timer.resume();
    jest.advanceTimersByTime(2000);
    timer.pause();
    expect(timer.elapsed()).toBe(2000);
    jest.advanceTimersByTime(10_000);
    expect(done).not.toHaveBeenCalled();
    timer.resume();
    timer.resume();
    jest.advanceTimersByTime(2999);
    expect(done).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
    timer.resume();
    jest.advanceTimersByTime(10_000);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('never fires after cancellation', () => {
    jest.useFakeTimers({ now });
    const done = jest.fn();
    const timer = createPausableTimer(1000, done);
    timer.resume();
    timer.cancel();
    jest.advanceTimersByTime(5000);
    expect(done).not.toHaveBeenCalled();
    expect(timer.isRunning()).toBe(false);
  });
});

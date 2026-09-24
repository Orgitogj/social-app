import { QueryClient } from '@tanstack/react-query';
import { markStoryViewed, markTrayStoryViewed, orderStoryTray, storyRingState, storyViewState } from '@/helpers/stories';
import type { Story, StoryTrayItem } from '@/types/domain';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/services/imageService', () => ({ uploadFileWithProgress: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));

// eslint-disable-next-line import/first
import { parseStoryTrayItem } from '@/services/storyService';
// eslint-disable-next-line import/first
import { applyStoryViewed, storyKeys } from '@/hooks/useStories';

const me = 'a0000000-0000-4000-8000-000000000001';
const alice = 'a0000000-0000-4000-8000-000000000002';
const john = 'a0000000-0000-4000-8000-000000000003';
const maria = 'a0000000-0000-4000-8000-000000000004';

const tray = (id: string, overrides: Partial<StoryTrayItem> = {}): StoryTrayItem => ({
  author: { id, name: id.slice(-1), username: null, image: null },
  story_count: 2,
  unviewed_count: 1,
  latest_story_at: '2026-09-24T10:00:00Z',
  has_close_friends: false,
  is_own: false,
  ...overrides,
});

const story = (id: string, viewed: boolean, authorId = alice): Story => ({
  id, author_id: authorId, media_type: 'image', media_path: `${authorId}/stories/${id}/media.jpg`, mime_type: 'image/jpeg', width: 1, height: 1,
  audience: 'followers', created_at: '2026-09-24T10:00:00Z', expires_at: '2026-09-25T10:00:00Z', viewed,
});

describe('story tray parsing', () => {
  it('parses grouped summaries and rejects inconsistent counts', () => {
    const row = { author: { id: alice, name: 'Alice', username: 'alice', image: null }, story_count: 3, unviewed_count: 1, latest_story_at: '2026-09-24T10:00:00Z', has_close_friends: true, is_own: false };
    expect(parseStoryTrayItem(row)).toMatchObject({ story_count: 3, unviewed_count: 1, has_close_friends: true });
    expect(parseStoryTrayItem({ ...row, unviewed_count: 4 })).toBeNull();
    expect(parseStoryTrayItem({ ...row, story_count: 0, unviewed_count: 0 })).toBeNull();
    expect(parseStoryTrayItem({ ...row, author: null })).toBeNull();
  });
});

describe('story tray ordering', () => {
  it('puts own stories first, then unviewed authors, then viewed authors', () => {
    const ordered = orderStoryTray([
      tray(john, { unviewed_count: 0, latest_story_at: '2026-09-24T12:00:00Z' }),
      tray(alice, { latest_story_at: '2026-09-24T09:00:00Z' }),
      tray(me, { is_own: true, unviewed_count: 0, latest_story_at: '2026-09-24T08:00:00Z' }),
      tray(maria, { latest_story_at: '2026-09-24T11:00:00Z' }),
    ]);
    expect(ordered.map(item => item.author.id)).toEqual([me, maria, alice, john]);
  });

  it('is deterministic for ties and drops duplicates or empty groups', () => {
    const input = [tray(john), tray(alice), tray(maria, { story_count: 0, unviewed_count: 0 })];
    expect(orderStoryTray(input).map(item => item.author.id)).toEqual([alice, john]);
    expect(orderStoryTray([...input].reverse()).map(item => item.author.id)).toEqual([alice, john]);
    expect(orderStoryTray([tray(alice), tray(alice, { unviewed_count: 0 })])).toEqual([tray(alice)]);
  });
});

describe('story rings and viewed state', () => {
  it('derives ring states', () => {
    expect(storyRingState(null)).toBe('none');
    expect(storyRingState(tray(alice))).toBe('unviewed');
    expect(storyRingState(tray(alice, { unviewed_count: 0 }))).toBe('viewed');
    expect(storyRingState(tray(me, { is_own: true, unviewed_count: 0 }))).toBe('unviewed');
  });

  it('calculates none, partial, and all viewed', () => {
    expect(storyViewState([story('1', false), story('2', false)])).toBe('none');
    expect(storyViewState([story('1', true), story('2', false)])).toBe('partial');
    expect(storyViewState([story('1', true), story('2', true)])).toBe('all');
  });

  it('marks views idempotently', () => {
    const stories = [story('1', false), story('2', true)];
    const once = markStoryViewed(stories, '1');
    expect(once?.map(item => item.viewed)).toEqual([true, true]);
    expect(markStoryViewed(once, '1')).toBe(once);
    const items = [tray(alice, { unviewed_count: 1 })];
    const updated = markTrayStoryViewed(items, alice);
    expect(updated?.[0].unviewed_count).toBe(0);
    expect(markTrayStoryViewed(updated, alice)).toBe(updated);
  });

  it('updates only the affected story caches', () => {
    const client = new QueryClient();
    client.setQueryData(storyKeys.author(alice), [story('1', false), story('2', false)]);
    client.setQueryData(storyKeys.tray(), [tray(alice, { unviewed_count: 2 }), tray(john)]);
    client.setQueryData(['posts'], ['untouched']);
    expect(applyStoryViewed(client, { id: '1', author_id: alice })).toBe(true);
    expect(applyStoryViewed(client, { id: '1', author_id: alice })).toBe(false);
    expect(client.getQueryData<StoryTrayItem[]>(storyKeys.tray())?.map(item => item.unviewed_count)).toEqual([1, 1]);
    expect(storyViewState(client.getQueryData<Story[]>(storyKeys.author(alice)) ?? [])).toBe('partial');
    expect(applyStoryViewed(client, { id: '2', author_id: alice })).toBe(true);
    expect(client.getQueryData<StoryTrayItem[]>(storyKeys.tray())?.[0].unviewed_count).toBe(0);
    expect(client.getQueryData(['posts'])).toEqual(['untouched']);
    client.clear();
  });
});

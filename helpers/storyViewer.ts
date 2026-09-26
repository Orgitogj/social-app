import { firstUnviewedIndex, isStoryExpired } from '@/helpers/stories';
import type { Story } from '@/types/domain';

export type StoryCursor = { authorIndex: number; storyId: string | null; storyIndex: number };
export type StoryStep = { type: 'move'; cursor: StoryCursor } | { type: 'restart' } | { type: 'close' };

export const startCursor = (authorIndex: number): StoryCursor => ({ authorIndex, storyId: null, storyIndex: 0 });

export function playableStories(stories: readonly Story[] | undefined, unavailable: ReadonlySet<string>, now = Date.now()): Story[] {
  return (stories ?? []).filter(story => !unavailable.has(story.id) && !isStoryExpired(story, now));
}

export function resolveStoryIndex(stories: readonly Story[], cursor: StoryCursor): number | null {
  if (!stories.length) return null;
  if (cursor.storyId === null) return firstUnviewedIndex(stories);
  const index = stories.findIndex(story => story.id === cursor.storyId);
  if (index !== -1) return index;
  return cursor.storyIndex < stories.length ? cursor.storyIndex : null;
}

export function nextStep(cursor: StoryCursor, stories: readonly Story[], index: number | null, authorCount: number): StoryStep {
  if (index !== null && index + 1 < stories.length) return { type: 'move', cursor: { authorIndex: cursor.authorIndex, storyId: stories[index + 1].id, storyIndex: index + 1 } };
  if (cursor.authorIndex + 1 < authorCount) return { type: 'move', cursor: startCursor(cursor.authorIndex + 1) };
  return { type: 'close' };
}

export function previousStep(cursor: StoryCursor, stories: readonly Story[], index: number | null): StoryStep {
  if (index !== null && index > 0) return { type: 'move', cursor: { authorIndex: cursor.authorIndex, storyId: stories[index - 1].id, storyIndex: index - 1 } };
  if (cursor.authorIndex > 0) return { type: 'move', cursor: startCursor(cursor.authorIndex - 1) };
  return { type: 'restart' };
}

export function nextExpiryDelay(stories: readonly Pick<Story, 'expires_at'>[], now = Date.now()): number | null {
  let soonest: number | null = null;
  for (const story of stories) {
    const remaining = new Date(story.expires_at).getTime() - now;
    if (Number.isFinite(remaining) && remaining > 0 && (soonest === null || remaining < soonest)) soonest = remaining;
  }
  return soonest === null ? null : Math.min(soonest + 50, 2_147_483_647);
}

export type PausableTimer = { resume: () => void; pause: () => void; cancel: () => void; elapsed: () => number; isRunning: () => boolean };

export function createPausableTimer(durationMs: number, onComplete: () => void, now: () => number = Date.now): PausableTimer {
  let elapsed = 0;
  let startedAt: number | null = null;
  let handle: ReturnType<typeof setTimeout> | null = null;
  let finished = false;
  const clear = () => {
    if (handle) clearTimeout(handle);
    handle = null;
  };
  return {
    resume: () => {
      if (finished || startedAt !== null) return;
      startedAt = now();
      handle = setTimeout(() => {
        handle = null;
        startedAt = null;
        elapsed = durationMs;
        finished = true;
        onComplete();
      }, Math.max(0, durationMs - elapsed));
    },
    pause: () => {
      if (startedAt === null) return;
      elapsed = Math.min(durationMs, elapsed + now() - startedAt);
      startedAt = null;
      clear();
    },
    cancel: () => {
      finished = true;
      startedAt = null;
      clear();
    },
    elapsed: () => Math.min(durationMs, elapsed + (startedAt === null ? 0 : now() - startedAt)),
    isRunning: () => startedAt !== null,
  };
}

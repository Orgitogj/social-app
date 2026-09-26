import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { useQueryClient } from '@tanstack/react-query';
import { nextExpiryDelay, nextStep, playableStories, previousStep, resolveStoryIndex, startCursor, type StoryCursor, type StoryStep } from '@/helpers/storyViewer';
import { authorStoriesQuery, storyKeys, storyMediaQuery, useAuthorStories } from '@/hooks/useStories';
import type { StoryTrayItem } from '@/types/domain';

export type StoryViewerScope = 'tray' | 'author';
export type StoryViewerOptions = { scope?: StoryViewerScope; initialStoryId?: string | null };
export type InitialStoryState = 'pending' | 'shown' | 'missing';

export function viewerAuthors(tray: readonly StoryTrayItem[] | undefined, initialAuthorId: string, scope: StoryViewerScope = 'tray'): string[] {
  if (scope === 'author') return [initialAuthorId];
  const ids = (tray ?? []).map(item => item.author.id);
  return ids.includes(initialAuthorId) ? ids : [initialAuthorId];
}

export function initialStoryState(current: InitialStoryState, loaded: boolean, found: boolean): InitialStoryState {
  if (current !== 'pending' || !loaded) return current;
  return found ? 'shown' : 'missing';
}

export function useStoryViewer(initialAuthorId: string, options: StoryViewerOptions = {}) {
  const client = useQueryClient();
  const initialStoryId = options.initialStoryId ?? null;
  const [authors] = useState(() => viewerAuthors(client.getQueryData<StoryTrayItem[]>(storyKeys.tray()), initialAuthorId, options.scope));
  const [cursor, setCursor] = useState<StoryCursor>(() => ({ ...startCursor(Math.max(0, authors.indexOf(initialAuthorId))), storyId: initialStoryId }));
  const [initialState, setInitialState] = useState<InitialStoryState>(initialStoryId ? 'pending' : 'shown');
  const [unavailable, setUnavailable] = useState<ReadonlySet<string>>(() => new Set());
  const [clock, setClock] = useState(() => Date.now());
  const [restartKey, setRestartKey] = useState(0);
  const [closed, setClosed] = useState(false);
  const authorId = authors[cursor.authorIndex];
  const query = useAuthorStories(authorId);
  const stories = useMemo(() => playableStories(query.data, unavailable, clock), [clock, query.data, unavailable]);
  const initialFound = Boolean(initialStoryId && stories.some(item => item.id === initialStoryId));
  const index = initialState === 'missing' || (initialState === 'pending' && !initialFound) ? null : resolveStoryIndex(stories, cursor);
  const story = index === null ? null : stories[index];

  const apply = useCallback((step: StoryStep) => {
    if (step.type === 'move') setCursor(step.cursor);
    else if (step.type === 'restart') setRestartKey(key => key + 1);
    else setClosed(true);
  }, []);

  useEffect(() => {
    if (story && index !== null && (cursor.storyId !== story.id || cursor.storyIndex !== index)) setCursor(current => ({ ...current, storyId: story.id, storyIndex: index }));
  }, [cursor.storyId, cursor.storyIndex, index, story]);

  useEffect(() => {
    setInitialState(current => initialStoryState(current, query.isSuccess, initialFound));
  }, [initialFound, query.isSuccess]);

  useEffect(() => {
    if (initialState === 'shown' && query.isSuccess && index === null) apply(nextStep(cursor, stories, null, authors.length));
  }, [apply, authors.length, cursor, index, initialState, query.isSuccess, stories]);

  useEffect(() => {
    const delay = nextExpiryDelay(query.data ?? [], clock);
    if (delay === null) return;
    const timeout = setTimeout(() => setClock(Date.now()), delay);
    return () => clearTimeout(timeout);
  }, [clock, query.data]);

  useEffect(() => {
    const nextAuthor = authors[cursor.authorIndex + 1];
    if (nextAuthor) void client.prefetchQuery(authorStoriesQuery(nextAuthor));
  }, [authors, client, cursor.authorIndex]);

  const upcoming = index === null ? undefined : stories[index + 1];
  useEffect(() => {
    if (!upcoming) return;
    let active = true;
    client.fetchQuery(storyMediaQuery(upcoming.media_path, upcoming.expires_at))
      .then(url => { if (active && upcoming.media_type === 'image') void Image.prefetch(url, 'memory'); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [client, upcoming]);

  const next = useCallback(() => apply(nextStep(cursor, stories, index, authors.length)), [apply, authors.length, cursor, index, stories]);
  const previous = useCallback(() => apply(previousStep(cursor, stories, index)), [apply, cursor, index, stories]);

  const markUnavailable = useCallback((storyId: string) => {
    setUnavailable(current => current.has(storyId) ? current : new Set(current).add(storyId));
    void client.invalidateQueries({ queryKey: storyKeys.author(authorId), exact: true });
  }, [authorId, client]);

  const revalidate = useCallback(() => {
    setClock(Date.now());
    void client.invalidateQueries({ queryKey: storyKeys.author(authorId), exact: true });
  }, [authorId, client]);

  return {
    story,
    index,
    count: stories.length,
    restartKey,
    closed,
    storyMissing: initialState === 'missing',
    isLoading: query.isPending,
    isError: query.isError && !query.data,
    retry: query.refetch,
    next,
    previous,
    markUnavailable,
    revalidate,
  };
}

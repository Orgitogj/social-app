import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { STORY_SIGNED_URL_TTL_SECONDS, markStoryViewed, markTrayStoryViewed, nextTrayExpiry, orderStoryTray } from '@/helpers/stories';
import { nextExpiryDelay } from '@/helpers/storyViewer';
import { fetchActiveStories, fetchStory, fetchStoryMute, fetchStoryTray, fetchStoryViewers, getStoryMediaUrl, recordStoryView, setStoryMute } from '@/services/storyService';
import { fetchCloseFriends } from '@/services/closeFriendsService';
import type { Story, StoryTrayItem } from '@/types/domain';
import { AppError } from '@/types/result';

export const STORY_STALE_TIME = 30_000;

export const storyKeys = {
  all: ['stories'] as const,
  tray: () => ['stories', 'tray'] as const,
  author: (authorId: string) => ['stories', 'author', authorId] as const,
  media: (path: string) => ['stories', 'media', path] as const,
  closeFriendsAvailable: () => ['stories', 'closeFriendsAvailable'] as const,
  viewers: (storyId: string) => ['stories', 'viewers', storyId] as const,
  story: (storyId: string) => ['stories', 'story', storyId] as const,
  mute: (userId: string) => ['stories', 'mute', userId] as const,
};

export const authorStoriesQuery = (authorId: string) => ({
  queryKey: storyKeys.author(authorId),
  staleTime: STORY_STALE_TIME,
  queryFn: async (): Promise<Story[]> => {
    const result = await fetchActiveStories(authorId);
    if (!result.success) throw new Error(result.error.message);
    return result.data;
  },
});

export const storyMediaQuery = (path: string, expiresAt: string) => ({
  queryKey: storyKeys.media(path),
  staleTime: (STORY_SIGNED_URL_TTL_SECONDS - 60) * 1000,
  gcTime: STORY_SIGNED_URL_TTL_SECONDS * 1000,
  retry: false,
  queryFn: async (): Promise<string> => {
    const result = await getStoryMediaUrl(path, expiresAt);
    if (!result.success) throw new AppError(result.error.code, result.error.retryable);
    return result.data;
  },
});

export function useStoryTray(userId?: string) {
  const query = useQuery({
    queryKey: storyKeys.tray(),
    enabled: Boolean(userId),
    staleTime: STORY_STALE_TIME,
    queryFn: async (): Promise<StoryTrayItem[]> => {
      const result = await fetchStoryTray();
      if (!result.success) throw new Error(result.error.message);
      return orderStoryTray(result.data);
    },
  });
  const { refetch, dataUpdatedAt, isFetching, data } = query;
  useEffect(() => {
    const delay = nextTrayExpiry(data);
    if (delay === null) return;
    const timeout = setTimeout(() => { void refetch(); }, delay);
    return () => clearTimeout(timeout);
  }, [data, refetch]);
  useFocusEffect(useCallback(() => {
    if (userId && !isFetching && dataUpdatedAt > 0 && Date.now() - dataUpdatedAt > STORY_STALE_TIME) void refetch();
  }, [dataUpdatedAt, isFetching, refetch, userId]));
  return query;
}

export function useAuthorStories(authorId?: string) {
  return useQuery({ ...authorStoriesQuery(authorId ?? 'missing'), enabled: Boolean(authorId) });
}

export function useStoryMediaUrl(path: string | null | undefined, expiresAt: string) {
  return useQuery({ ...storyMediaQuery(path ?? 'missing', expiresAt), enabled: Boolean(path) });
}

export function refreshStoryTray(client: QueryClient) {
  return client.invalidateQueries({ queryKey: storyKeys.tray(), exact: true });
}

export function applyStoryViewed(client: QueryClient, story: Pick<Story, 'id' | 'author_id'>): boolean {
  const current = client.getQueryData<Story[]>(storyKeys.author(story.author_id));
  const next = markStoryViewed(current, story.id);
  if (!current || next === current) return false;
  client.setQueryData<Story[]>(storyKeys.author(story.author_id), next);
  client.setQueryData<StoryTrayItem[]>(storyKeys.tray(), items => markTrayStoryViewed(items, story.author_id));
  return true;
}

export function useMarkStoryViewed(currentUserId?: string) {
  const client = useQueryClient();
  const pending = useRef(new Set<string>());
  return useCallback(async (story: Story) => {
    if (!currentUserId || story.author_id === currentUserId || story.viewed || pending.current.has(story.id)) return;
    pending.current.add(story.id);
    const changed = applyStoryViewed(client, story);
    const result = await recordStoryView(story.id);
    pending.current.delete(story.id);
    if (result.success) return;
    if (changed || result.error.code === 'notAllowed') {
      void client.invalidateQueries({ queryKey: storyKeys.author(story.author_id), exact: true });
      void refreshStoryTray(client);
    }
  }, [client, currentUserId]);
}

export function useCloseFriendsAvailable(enabled: boolean) {
  return useQuery({
    queryKey: storyKeys.closeFriendsAvailable(),
    enabled,
    staleTime: STORY_STALE_TIME,
    queryFn: async () => {
      const result = await fetchCloseFriends();
      if (!result.success) throw new Error(result.error.message);
      return result.data.items.length > 0;
    },
  });
}

export function useStoryViewers(storyId: string | undefined, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: storyKeys.viewers(storyId ?? 'missing'),
    enabled: Boolean(storyId) && enabled,
    staleTime: 10_000,
    initialPageParam: null as { viewed_at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      const result = await fetchStoryViewers(storyId ?? '', pageParam);
      if (!result.success) throw new AppError(result.error.code, result.error.retryable);
      return result.data;
    },
    getNextPageParam: page => page.nextCursor,
  });
}

export function useStory(storyId: string | undefined) {
  return useQuery({
    queryKey: storyKeys.story(storyId ?? 'missing'),
    enabled: Boolean(storyId),
    staleTime: 0,
    retry: false,
    queryFn: async (): Promise<Story | null> => {
      const result = await fetchStory(storyId ?? '');
      if (!result.success) throw new AppError(result.error.code, result.error.retryable);
      return result.data;
    },
  });
}

export function useExpiryClock(stories: readonly Pick<Story, 'expires_at'>[] | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const delay = nextExpiryDelay(stories ?? [], Date.now());
    if (delay === null) return;
    const timeout = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timeout);
  }, [now, stories]);
  return now;
}

export function applyStoryMute(client: QueryClient, userId: string, muted: boolean) {
  client.setQueryData<boolean>(storyKeys.mute(userId), muted);
  client.setQueryData<StoryTrayItem[]>(storyKeys.tray(), items => items ? orderStoryTray(items.map(item => item.author.id === userId ? { ...item, muted } : item)) : items);
}

export const storyMuteQuery = (userId: string) => ({
  queryKey: storyKeys.mute(userId),
  staleTime: STORY_STALE_TIME,
  queryFn: async (): Promise<boolean> => {
    const result = await fetchStoryMute(userId);
    if (!result.success) throw new AppError(result.error.code, result.error.retryable);
    return result.data;
  },
});

export function useStoryMute(userId: string | undefined, enabled: boolean) {
  const client = useQueryClient();
  const query = useQuery({ ...storyMuteQuery(userId ?? 'missing'), enabled: Boolean(userId) && enabled });
  const load = useCallback(async () => userId ? client.fetchQuery(storyMuteQuery(userId)) : false, [client, userId]);
  const setMuted = useCallback(async (muted: boolean) => {
    if (!userId) return false;
    const previous = client.getQueryData<boolean>(storyKeys.mute(userId)) ?? false;
    applyStoryMute(client, userId, muted);
    const result = await setStoryMute(userId, muted);
    if (!result.success) applyStoryMute(client, userId, previous);
    return result.success;
  }, [client, userId]);
  return { muted: query.data === true, isLoading: query.isPending && Boolean(userId) && enabled, setMuted, load };
}

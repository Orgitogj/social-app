import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { STORY_SIGNED_URL_TTL_SECONDS, orderStoryTray } from '@/helpers/stories';
import { fetchActiveStories, fetchStoryTray, getStoryMediaUrl } from '@/services/storyService';
import type { Story, StoryTrayItem } from '@/types/domain';

export const STORY_STALE_TIME = 30_000;

export const storyKeys = {
  all: ['stories'] as const,
  tray: () => ['stories', 'tray'] as const,
  author: (authorId: string) => ['stories', 'author', authorId] as const,
  media: (path: string) => ['stories', 'media', path] as const,
  closeFriendsAvailable: () => ['stories', 'closeFriendsAvailable'] as const,
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
    if (!result.success) throw new Error(result.error.message);
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
  const { refetch, dataUpdatedAt, isFetching } = query;
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

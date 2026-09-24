import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type Animated } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import StoryImage from '@/components/stories/StoryImage';
import StoryVideo from '@/components/stories/StoryVideo';
import { theme } from '@/constants/theme';
import { storyKeys, useStoryMediaUrl } from '@/hooks/useStories';
import type { Story } from '@/types/domain';
import { AppError } from '@/types/result';

type StoryPlayerProps = {
  story: Story;
  paused: boolean;
  progress: Animated.Value;
  onViewed: () => void;
  onComplete: () => void;
  onUnavailable: () => void;
};

export const MEDIA_REFRESH_INTERVAL_MS = 30_000;

export function storyDescription(story: Story) {
  const kind = story.media_type === 'video' ? 'Video' : 'Photo';
  const author = story.author?.name ?? 'this account';
  return story.caption ? `${kind} story by ${author}: ${story.caption}` : `${kind} story by ${author}`;
}

export function shouldRefreshMedia(lastRefreshAt: number | null, now = Date.now()) {
  return lastRefreshAt === null || now - lastRefreshAt > MEDIA_REFRESH_INTERVAL_MS;
}

export function isTransientMediaError(error: unknown) {
  return error instanceof AppError && error.retryable;
}

function StoryPlayer({ story, paused, progress, onViewed, onComplete, onUnavailable }: StoryPlayerProps) {
  const client = useQueryClient();
  const media = useStoryMediaUrl(story.media_path, story.expires_at);
  const lastRefreshAt = useRef<number | null>(null);
  const [resumeAt, setResumeAt] = useState(0);
  const transient = media.isError && isTransientMediaError(media.error);

  useEffect(() => {
    if (media.isError && !transient) onUnavailable();
  }, [media.isError, onUnavailable, transient]);

  const onMediaError = useCallback((position: number) => {
    if (!shouldRefreshMedia(lastRefreshAt.current)) {
      onUnavailable();
      return;
    }
    lastRefreshAt.current = Date.now();
    setResumeAt(position);
    void client.invalidateQueries({ queryKey: storyKeys.media(story.media_path), exact: true });
  }, [client, onUnavailable, story.media_path]);

  if (transient) {
    return (
      <View style={styles.center}>
        <Text style={styles.message} accessibilityRole="alert">This story couldn’t load. Check your connection.</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => { void media.refetch(); }} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>Try again</Text></Pressable>
          <Pressable onPress={onComplete} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>Skip</Text></Pressable>
        </View>
      </View>
    );
  }
  if (!media.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="white" size="large" accessibilityLabel="Loading story" />
      </View>
    );
  }
  const Player = story.media_type === 'video' ? StoryVideo : StoryImage;
  return <Player key={media.data} story={story} url={media.data} startAt={resumeAt} paused={paused} progress={progress} description={storyDescription(story)} onViewed={onViewed} onComplete={onComplete} onMediaError={onMediaError} />;
}

export default memo(StoryPlayer);

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  message: {
    color: 'white',
    fontSize: 15,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: theme.fonts.semibold,
  },
});

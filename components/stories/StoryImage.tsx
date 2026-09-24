import React, { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { STORY_IMAGE_DURATION_MS, STORY_VIEW_THRESHOLD_MS } from '@/constants';
import { createPausableTimer, type PausableTimer } from '@/helpers/storyViewer';
import type { Story } from '@/types/domain';

export type StoryMediaProps = {
  story: Story;
  url: string;
  paused: boolean;
  progress: Animated.Value;
  description: string;
  onViewed: () => void;
  onComplete: () => void;
  onUnavailable: () => void;
};

function StoryImage({ url, paused, progress, description, onViewed, onComplete, onUnavailable }: StoryMediaProps) {
  const [loaded, setLoaded] = useState(false);
  const handlers = useRef({ onViewed, onComplete });
  const timers = useRef<{ complete: PausableTimer; threshold: PausableTimer } | null>(null);

  useEffect(() => { handlers.current = { onViewed, onComplete }; }, [onComplete, onViewed]);

  useEffect(() => {
    progress.setValue(0);
    const complete = createPausableTimer(STORY_IMAGE_DURATION_MS, () => handlers.current.onComplete());
    const threshold = createPausableTimer(STORY_VIEW_THRESHOLD_MS, () => handlers.current.onViewed());
    timers.current = { complete, threshold };
    return () => {
      complete.cancel();
      threshold.cancel();
      progress.stopAnimation();
      timers.current = null;
    };
  }, [progress]);

  useEffect(() => {
    const current = timers.current;
    if (!current) return;
    if (!loaded || paused) {
      current.complete.pause();
      current.threshold.pause();
      progress.stopAnimation();
      return;
    }
    current.complete.resume();
    current.threshold.resume();
    Animated.timing(progress, { toValue: 1, duration: Math.max(0, STORY_IMAGE_DURATION_MS - current.complete.elapsed()), easing: Easing.linear, useNativeDriver: true }).start();
  }, [loaded, paused, progress]);

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: url }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        cachePolicy="memory"
        transition={0}
        onLoad={() => setLoaded(true)}
        onError={onUnavailable}
        accessible
        accessibilityRole="image"
        accessibilityLabel={description}
      />
      {!loaded ? <ActivityIndicator style={styles.loading} color="white" size="large" accessibilityLabel="Loading story" /> : null}
    </View>
  );
}

export default memo(StoryImage);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
  },
});

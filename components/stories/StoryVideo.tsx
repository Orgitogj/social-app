import React, { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { STORY_VIEW_THRESHOLD_MS } from '@/constants';
import type { StoryMediaProps } from '@/components/stories/StoryImage';

function StoryVideo({ url, startAt, paused, progress, description, onViewed, onComplete, onMediaError }: StoryMediaProps) {
  const [ready, setReady] = useState(false);
  const viewed = useRef(false);
  const completed = useRef(false);
  const seeked = useRef(false);
  const player = useVideoPlayer({ uri: url }, instance => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.1;
  });

  useEffect(() => { progress.setValue(0); }, [progress]);

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') {
      if (!seeked.current && startAt > 0) player.currentTime = startAt;
      seeked.current = true;
      setReady(true);
    }
    if (status === 'error') onMediaError(player.currentTime);
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const duration = player.duration;
    if (duration > 0) progress.setValue(Math.min(1, currentTime / duration));
    if (!viewed.current && currentTime * 1000 >= Math.min(STORY_VIEW_THRESHOLD_MS, duration * 1000)) {
      viewed.current = true;
      onViewed();
    }
  });

  useEventListener(player, 'playToEnd', () => {
    if (completed.current) return;
    completed.current = true;
    progress.setValue(1);
    if (!viewed.current) {
      viewed.current = true;
      onViewed();
    }
    onComplete();
  });

  useEffect(() => {
    if (!ready || completed.current) return;
    if (paused) player.pause();
    else player.play();
  }, [paused, player, ready]);

  return (
    <View style={styles.container}>
      <VideoView style={StyleSheet.absoluteFill} player={player} contentFit="contain" nativeControls={false} allowsPictureInPicture={false} accessible accessibilityLabel={description} />
      {!ready ? <ActivityIndicator style={styles.loading} color="white" size="large" accessibilityLabel="Loading story" /> : null}
    </View>
  );
}

export default memo(StoryVideo);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
  },
});

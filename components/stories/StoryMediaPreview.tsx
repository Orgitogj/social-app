import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { theme } from '@/constants/theme';
import type { StoryDraft } from '@/types/domain';

type StoryMediaPreviewProps = { draft: StoryDraft; paused?: boolean };

function VideoPreview({ uri, paused }: { uri: string; paused: boolean }) {
  const player = useVideoPlayer(uri, instance => {
    instance.loop = true;
  });
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);
  return <VideoView style={StyleSheet.absoluteFill} player={player} contentFit="contain" nativeControls={false} accessibilityLabel="Selected video preview" />;
}

function StoryMediaPreview({ draft, paused = false }: StoryMediaPreviewProps) {
  return (
    <View style={styles.container}>
      {draft.mediaType === 'video'
        ? <VideoPreview uri={draft.uri} paused={paused} />
        : <Image source={{ uri: draft.uri }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="none" accessibilityLabel="Selected photo preview" />}
    </View>
  );
}

export default memo(StoryMediaPreview);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.media,
  },
});

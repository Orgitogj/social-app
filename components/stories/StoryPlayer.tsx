import React, { memo, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, type Animated } from 'react-native';
import StoryImage from '@/components/stories/StoryImage';
import StoryVideo from '@/components/stories/StoryVideo';
import { useStoryMediaUrl } from '@/hooks/useStories';
import type { Story } from '@/types/domain';

type StoryPlayerProps = {
  story: Story;
  paused: boolean;
  progress: Animated.Value;
  onViewed: () => void;
  onComplete: () => void;
  onUnavailable: () => void;
};

export function storyDescription(story: Story) {
  const kind = story.media_type === 'video' ? 'Video' : 'Photo';
  const author = story.author?.name ?? 'this account';
  return story.caption ? `${kind} story by ${author}: ${story.caption}` : `${kind} story by ${author}`;
}

function StoryPlayer({ story, paused, progress, onViewed, onComplete, onUnavailable }: StoryPlayerProps) {
  const media = useStoryMediaUrl(story.media_path, story.expires_at);

  useEffect(() => {
    if (media.isError) onUnavailable();
  }, [media.isError, onUnavailable]);

  if (!media.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="white" size="large" accessibilityLabel="Loading story" />
      </View>
    );
  }
  const Player = story.media_type === 'video' ? StoryVideo : StoryImage;
  return <Player story={story} url={media.data} paused={paused} progress={progress} description={storyDescription(story)} onViewed={onViewed} onComplete={onComplete} onUnavailable={onUnavailable} />;
}

export default memo(StoryPlayer);

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

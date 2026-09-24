import React, { memo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Cancel01Icon, PauseIcon, PlayIcon } from '@hugeicons/core-free-icons';
import Avatar from '@/components/Avatar';
import StoryProgressBar from '@/components/stories/StoryProgressBar';
import { theme } from '@/constants/theme';
import { relativeTime } from '@/helpers/common';
import type { Story } from '@/types/domain';

type StoryViewerHeaderProps = {
  story: Story;
  count: number;
  index: number;
  progress: Animated.Value;
  paused: boolean;
  onTogglePause: () => void;
  onClose: () => void;
};

function StoryViewerHeader({ story, count, index, progress, paused, onTogglePause, onClose }: StoryViewerHeaderProps) {
  const author = story.author;
  const name = author?.username || author?.name || 'Story';
  const time = relativeTime(story.created_at);
  return (
    <View style={styles.container}>
      <StoryProgressBar count={count} index={index} progress={progress} />
      <View style={styles.row}>
        <View style={styles.author} accessible accessibilityLabel={`${author?.name ?? name}, posted ${time}${story.audience === 'close_friends' ? ', shared with Close Friends' : ''}`}>
          <Avatar uri={author?.image ?? undefined} size={34} rounded={11} style={styles.avatar} />
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.time} numberOfLines={1}>{time}</Text>
          {story.audience === 'close_friends' ? <View style={styles.badge}><Text style={styles.badgeText}>Close Friends</Text></View> : null}
        </View>
        <Pressable onPress={onTogglePause} hitSlop={8} accessibilityRole="button" accessibilityLabel={paused ? 'Resume story' : 'Pause story'} style={styles.button}>
          <HugeiconsIcon icon={paused ? PlayIcon : PauseIcon} size={22} color="white" />
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close stories" style={styles.button}>
          <HugeiconsIcon icon={Cancel01Icon} size={24} color="white" />
        </Pressable>
      </View>
    </View>
  );
}

export default memo(StoryViewerHeader);

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  author: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  avatar: {
    borderWidth: 0,
  },
  name: {
    flexShrink: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: theme.fonts.semibold,
    textShadowColor: theme.colors.overlay,
    textShadowRadius: 4,
  },
  time: {
    color: 'white',
    opacity: 0.8,
    fontSize: 13,
    textShadowColor: theme.colors.overlay,
    textShadowRadius: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: theme.colors.closeFriends,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: theme.fonts.bold,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

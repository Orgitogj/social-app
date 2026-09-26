import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Avatar from '@/components/Avatar';
import { theme } from '@/constants/theme';
import type { StoryRingState } from '@/types/domain';

type StoryAvatarProps = {
  uri?: string | null;
  size?: number;
  state: StoryRingState;
  closeFriends?: boolean;
  onAddPress?: () => void;
  rounded?: number;
};

const RING_WIDTH = 2.5;
const RING_GAP = 2;

export function storyRingColor(state: StoryRingState, closeFriends = false) {
  if (state === 'none') return 'transparent';
  if (state === 'viewed') return theme.colors.storyViewed;
  return closeFriends ? theme.colors.closeFriends : theme.colors.primary;
}

function StoryAvatar({ uri, size = 64, state, closeFriends = false, onAddPress, rounded: radius }: StoryAvatarProps) {
  const rounded = radius ?? Math.round(size * 0.32);
  const outer = size + (RING_WIDTH + RING_GAP) * 2;
  const badge = Math.round(size * 0.34);
  return (
    <View style={{ width: outer, height: outer }}>
      <View style={[styles.ring, { width: outer, height: outer, borderRadius: rounded + RING_WIDTH + RING_GAP, borderColor: storyRingColor(state, closeFriends) }]}>
        <Avatar uri={uri ?? undefined} size={size} rounded={rounded} style={styles.avatar} />
      </View>
      {onAddPress ? (
        <Pressable
          onPress={onAddPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add to your story"
          style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2 }]}
        >
          <Text style={[styles.badgeText, { fontSize: badge * 0.72, lineHeight: badge * 0.86 }]}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default memo(StoryAvatar);

const styles = StyleSheet.create({
  ring: {
    borderWidth: RING_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  avatar: {
    borderWidth: 0,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontWeight: theme.fonts.bold,
    textAlign: 'center',
  },
});

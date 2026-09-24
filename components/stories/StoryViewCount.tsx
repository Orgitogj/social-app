import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ViewIcon } from '@hugeicons/core-free-icons';
import { theme } from '@/constants/theme';

export function viewCountLabel(count: number | null | undefined) {
  const value = count ?? 0;
  return value === 1 ? '1 viewer' : `${value} viewers`;
}

function StoryViewCount({ count, onPress }: { count: number | null | undefined; onPress: () => void }) {
  const label = viewCountLabel(count);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. Show who viewed your story`} hitSlop={8} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <HugeiconsIcon icon={ViewIcon} size={20} color="white" />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

export default memo(StoryViewCount);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.overlay,
  },
  pressed: {
    opacity: 0.75,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: theme.fonts.semibold,
  },
});

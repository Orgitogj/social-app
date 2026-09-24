import React, { memo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';

type StoryProgressBarProps = { count: number; index: number; progress: Animated.Value };

function StoryProgressBar({ count, index, progress }: StoryProgressBarProps) {
  return (
    <View style={styles.row} accessible accessibilityRole="progressbar" accessibilityLabel={`Story ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, segment) => (
        <View key={segment} style={styles.track}>
          {segment < index ? <View style={[styles.fill, styles.full]} /> : null}
          {segment === index ? <Animated.View style={[styles.fill, styles.full, { transform: [{ scaleX: progress }] }]} /> : null}
        </View>
      ))}
    </View>
  );
}

export default memo(StoryProgressBar);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: theme.colors.overlayLight,
  },
  fill: {
    height: 3,
    backgroundColor: 'white',
    transformOrigin: 'left',
  },
  full: {
    width: '100%',
  },
});

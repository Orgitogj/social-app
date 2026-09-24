import React, { memo, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { theme } from '@/constants/theme';
import { splitMentions } from '@/helpers/common';

function StoryCaption({ caption }: { caption: string }) {
  const segments = useMemo(() => splitMentions(caption), [caption]);
  return (
    <Text style={styles.caption} importantForAccessibility="no">
      {segments.map((segment, index) => segment.mention
        ? <Text key={index} style={styles.mention}>{segment.text}</Text>
        : segment.text)}
    </Text>
  );
}

export default memo(StoryCaption);

const styles = StyleSheet.create({
  caption: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  mention: {
    fontWeight: theme.fonts.bold,
    textDecorationLine: 'underline',
  },
});

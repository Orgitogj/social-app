import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

export const STORY_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'] as const;

const REACTION_NAMES: Record<(typeof STORY_REACTIONS)[number], string> = { '❤️': 'love', '😂': 'laugh', '😮': 'wow', '😢': 'sad', '🔥': 'fire', '👍': 'like' };

type StoryReactionBarProps = { onReact: (emoji: string) => void; disabled?: boolean; sentReaction?: string | null };

function StoryReactionBar({ onReact, disabled = false, sentReaction }: StoryReactionBarProps) {
  return (
    <View style={styles.row} accessibilityRole="toolbar" accessibilityLabel="Quick reactions">
      {STORY_REACTIONS.map(emoji => (
        <Pressable
          key={emoji}
          onPress={() => onReact(emoji)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`React with ${REACTION_NAMES[emoji]}`}
          accessibilityState={{ disabled, selected: sentReaction === emoji }}
          style={({ pressed }) => [styles.reaction, sentReaction === emoji && styles.sent, pressed && styles.pressed]}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default memo(StoryReactionBar);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  reaction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay,
  },
  sent: {
    backgroundColor: theme.colors.primary,
  },
  pressed: {
    transform: [{ scale: 1.2 }],
  },
  emoji: {
    fontSize: 24,
  },
});

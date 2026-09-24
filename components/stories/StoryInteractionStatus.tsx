import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '@/constants/theme';
import type { StoryInteractionState } from '@/hooks/useStoryInteraction';

export function interactionStatusLabel(state: StoryInteractionState) {
  if (state.status === 'sending') return 'Sending…';
  if (state.status === 'sent') return state.kind === 'reaction' ? `Sent ${state.reaction ?? ''}`.trim() : 'Reply sent';
  if (state.status !== 'failed') return '';
  if (state.error === 'notAllowed') return 'You can’t reply to this story.';
  if (state.error === 'rateLimited') return 'You’re sending too fast. Try again shortly.';
  return 'Couldn’t send.';
}

type StoryInteractionStatusProps = { state: StoryInteractionState; canRetry: boolean; onRetry: () => void };

function StoryInteractionStatus({ state, canRetry, onRetry }: StoryInteractionStatusProps) {
  const label = interactionStatusLabel(state);
  if (!label) return null;
  if (state.status === 'failed' && canRetry) {
    return (
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={`${label} Try again`} style={styles.retry}>
        <Text style={styles.text} accessibilityLiveRegion="polite">{label} <Text style={styles.link}>Try again</Text></Text>
      </Pressable>
    );
  }
  return <Text style={styles.text} accessibilityLiveRegion="polite">{label}</Text>;
}

export default memo(StoryInteractionStatus);

const styles = StyleSheet.create({
  text: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    textShadowColor: theme.colors.overlay,
    textShadowRadius: 4,
  },
  link: {
    fontWeight: theme.fonts.bold,
    textDecorationLine: 'underline',
  },
  retry: {
    minHeight: 32,
    justifyContent: 'center',
  },
});

import React, { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type StoryUnavailableProps = { onClose: () => void; loading?: boolean; onRetry?: () => void };

function StoryUnavailable({ onClose, loading = false, onRetry }: StoryUnavailableProps) {
  return (
    <View style={styles.screen}>
      {loading ? (
        <ActivityIndicator color="white" size="large" accessibilityLabel="Loading story" />
      ) : (
        <Text style={styles.message} accessibilityRole="alert">{onRetry ? 'This story couldn’t load. Check your connection.' : 'Story is no longer available'}</Text>
      )}
      <View style={styles.actions}>
        {onRetry && !loading ? <Pressable onPress={onRetry} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>Try again</Text></Pressable> : null}
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.action}><Text style={styles.actionText}>Close</Text></Pressable>
      </View>
    </View>
  );
}

export default memo(StoryUnavailable);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.media,
  },
  message: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: theme.fonts.semibold,
  },
});

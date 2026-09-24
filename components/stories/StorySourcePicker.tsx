import React, { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/assets/icons';
import { theme } from '@/constants/theme';
import type { StoryMediaSource } from '@/services/storyMediaService';

type StorySourcePickerProps = { onSelect: (source: StoryMediaSource) => void; busy?: boolean };

const SOURCES: { source: StoryMediaSource; icon: string; label: string; hint: string }[] = [
  { source: 'camera', icon: 'camera', label: 'Camera', hint: 'Take a photo or record a video up to 60 seconds' },
  { source: 'library', icon: 'image', label: 'Gallery', hint: 'Choose a photo or video from your device' },
];

function StorySourcePicker({ onSelect, busy = false }: StorySourcePickerProps) {
  return (
    <View style={styles.container}>
      {SOURCES.map(item => (
        <Pressable
          key={item.source}
          onPress={() => onSelect(item.source)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityHint={item.hint}
          accessibilityState={{ disabled: busy }}
          style={({ pressed }) => [styles.option, pressed && styles.pressed]}
        >
          <View style={styles.icon}>
            <Icon name={item.icon} size={28} color="white" strokeWidth={1.8} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.hint}>{item.hint}</Text>
          </View>
        </Pressable>
      ))}
      {busy ? <ActivityIndicator color={theme.colors.primary} accessibilityLabel="Preparing media" /> : null}
    </View>
  );
}

export default memo(StorySourcePicker);

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    padding: 14,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },
  pressed: {
    opacity: 0.75,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: theme.fonts.semibold,
    color: theme.colors.textDark,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
});

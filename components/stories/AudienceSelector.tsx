import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { storyErrorMessage } from '@/helpers/stories';
import type { StoryAudience } from '@/types/domain';

type AudienceSelectorProps = {
  value: StoryAudience;
  onChange: (audience: StoryAudience) => void;
  closeFriendsAvailable?: boolean;
  disabled?: boolean;
};

const OPTIONS: { value: StoryAudience; label: string; description: string }[] = [
  { value: 'followers', label: 'Followers', description: 'Everyone who follows you' },
  { value: 'close_friends', label: 'Close Friends', description: 'Only people on your Close Friends list' },
];

function AudienceSelector({ value, onChange, closeFriendsAvailable, disabled = false }: AudienceSelectorProps) {
  const selected = OPTIONS.find(option => option.value === value) ?? OPTIONS[0];
  return (
    <View style={styles.container}>
      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="Story audience">
        {OPTIONS.map(option => {
          const active = option.value === value;
          const accent = option.value === 'close_friends' ? theme.colors.closeFriends : theme.colors.primary;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled }}
              accessibilityLabel={option.label}
              accessibilityHint={option.description}
              style={[styles.option, active && { backgroundColor: accent, borderColor: accent }]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.description} accessibilityLiveRegion="polite">
        {value === 'close_friends' && closeFriendsAvailable === false ? storyErrorMessage('noCloseFriends') : `Visible to: ${selected.description.toLowerCase()}`}
      </Text>
    </View>
  );
}

export default memo(AudienceSelector);

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.overlayLight,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  optionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: theme.fonts.medium,
  },
  optionTextActive: {
    fontWeight: theme.fonts.bold,
  },
  description: {
    color: 'white',
    fontSize: 13,
    textShadowColor: theme.colors.overlay,
    textShadowRadius: 4,
  },
});

import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { SentIcon } from '@hugeicons/core-free-icons';
import { theme } from '@/constants/theme';

type StoryReplyBarProps = { authorName: string; sending: boolean; onSend: (text: string) => Promise<boolean>; onFocusChange: (focused: boolean) => void };

function StoryReplyBar({ authorName, sending, onSend, onFocusChange }: StoryReplyBarProps) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !sending;
  const submit = async () => {
    if (!canSend) return;
    const sent = await onSend(text);
    if (sent) setText('');
  };
  return (
    <View style={styles.row}>
      <TextInput
        value={text}
        onChangeText={setText}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        placeholder={`Reply to ${authorName}…`}
        placeholderTextColor={theme.colors.storyViewed}
        maxLength={4000}
        multiline
        style={styles.input}
        accessibilityLabel={`Reply to ${authorName}`}
        returnKeyType="send"
        onSubmitEditing={() => { void submit(); }}
      />
      <Pressable
        onPress={() => { void submit(); }}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send reply"
        accessibilityState={{ disabled: !canSend, busy: sending }}
        style={[styles.send, !canSend && styles.disabled]}
      >
        <HugeiconsIcon icon={SentIcon} size={22} color="white" />
      </Pressable>
    </View>
  );
}

export default memo(StoryReplyBar);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.overlayLight,
    color: 'white',
    fontSize: 15,
    backgroundColor: theme.colors.overlay,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  disabled: {
    opacity: 0.45,
  },
});

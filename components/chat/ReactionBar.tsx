import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MessageReaction } from '@/types/domain';
import { theme } from '@/constants/theme';

export function ReactionBar({ reactions, onPress }: { reactions?: MessageReaction[]; onPress: (emoji: string) => void }) {
  if (!reactions?.length) return null;
  return <View style={styles.container}>
    {reactions.map(reaction => <Pressable key={reaction.emoji} onPress={() => onPress(reaction.emoji)} style={[styles.reaction, reaction.reacted_by_me && styles.active]}>
      <Text style={styles.text}>{reaction.emoji} {reaction.count}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  reaction: { borderRadius: 14, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#f3f4f6', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.gray },
  active: { borderColor: theme.colors.primary, backgroundColor: '#e6f9ef' },
  text: { fontSize: 12 },
});

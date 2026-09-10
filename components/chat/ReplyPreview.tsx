import { StyleSheet, Text, View } from 'react-native';
import type { MessageReplyPreview } from '@/types/domain';
import { theme } from '@/constants/theme';

type Props = { reply: MessageReplyPreview; label: string; onClear?: () => void };

export function ReplyPreview({ reply, label, onClear }: Props) {
  const preview = reply.deleted_at ? 'This message was deleted' : reply.text || (reply.message_type === 'image' ? 'Photo' : 'Message');
  return <View style={styles.container}>
    <View style={styles.copy}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.text} numberOfLines={1}>{preview}</Text>
    </View>
    {onClear ? <Text accessibilityRole="button" onPress={onClear} style={styles.clear}>×</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 10, borderLeftWidth: 3, borderLeftColor: theme.colors.primary, backgroundColor: '#f3f4f6', borderRadius: theme.radius.sm, padding: 8, alignItems: 'center' },
  copy: { flex: 1, gap: 2 },
  label: { color: theme.colors.primaryDark, fontWeight: theme.fonts.semibold as '600', fontSize: 12 },
  text: { color: theme.colors.textLight, fontSize: 12 },
  clear: { color: theme.colors.textLight, fontSize: 23, paddingHorizontal: 4 },
});

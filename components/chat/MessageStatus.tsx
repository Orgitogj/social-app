import { Text, StyleSheet } from 'react-native';
import type { MessageStatus as Status } from '@/types/domain';
import { theme } from '@/constants/theme';

export function MessageStatus({ status }: { status?: Status }) {
  if (status === 'sending') return <Text style={styles.pending}>Sending</Text>;
  if (status === 'failed') return <Text style={styles.failed}>Failed</Text>;
  if (status === 'read') return <Text style={styles.read}>✓✓</Text>;
  if (status === 'delivered') return <Text style={styles.status}>✓✓</Text>;
  return <Text style={styles.status}>✓</Text>;
}

const styles = StyleSheet.create({
  status: { color: theme.colors.textLight, fontSize: 11 },
  read: { color: theme.colors.primaryDark, fontSize: 11 },
  pending: { color: theme.colors.textLight, fontSize: 10 },
  failed: { color: theme.colors.rose, fontSize: 10, fontWeight: theme.fonts.semibold as '600' },
});

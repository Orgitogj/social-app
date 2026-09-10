import { Pressable, StyleSheet, Text, View } from 'react-native';
import Avatar from '@/components/Avatar';
import type { Conversation } from '@/types/domain';
import { relativeTime } from '@/helpers/common';
import { theme } from '@/constants/theme';
import { MessageStatus } from './MessageStatus';

export function ConversationRow({ conversation, onPress }: { conversation: Conversation; onPress: () => void }) {
  const last = conversation.latest_message;
  const preview = last?.deleted_at ? 'This message was deleted' : last?.text || (last?.message_type === 'image' ? 'Photo' : 'No messages yet');
  const unread = conversation.unread_count ?? 0;
  const mine = Boolean(last && conversation.other_user && last.userId !== conversation.other_user.id);
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
    <Avatar uri={conversation.other_user?.image} size={48} rounded={24} />
    <View style={styles.body}>
      <Text numberOfLines={1} style={styles.name}>{conversation.other_user?.name ?? 'Conversation'}</Text>
      <View style={styles.previewRow}>
        {mine && last ? <MessageStatus status={last.status} /> : null}
        <Text numberOfLines={1} style={[styles.preview, unread > 0 && styles.unreadPreview]}>{preview}</Text>
      </View>
    </View>
    <View style={styles.meta}>
      <Text style={styles.time}>{last ? relativeTime(last.created_at) : ''}</Text>
      {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View> : null}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  body: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: theme.colors.textDark, fontSize: 16, fontWeight: theme.fonts.semibold as '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  preview: { color: theme.colors.textLight, fontSize: 14, flex: 1 },
  unreadPreview: { color: theme.colors.textDark, fontWeight: theme.fonts.semibold as '600' },
  meta: { alignItems: 'flex-end', gap: 7 },
  time: { color: theme.colors.textLight, fontSize: 11 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark },
  badgeText: { color: 'white', fontSize: 10, fontWeight: theme.fonts.bold as '700' },
});

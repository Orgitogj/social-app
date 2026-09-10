import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '@/components/screenWrapper';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { fetchNotificationPreferences, updateNotificationPreferences } from '@/services/notificationsService';
import { registerPushToken, unregisterPushToken } from '@/services/pushService';
import type { NotificationPreferences } from '@/types/domain';
import { theme } from '@/constants/theme';

type ToggleKey = Exclude<keyof NotificationPreferences, 'userId' | 'updated_at'>;
const labels: { key: ToggleKey; label: string; detail?: string }[] = [
  { key: 'push_enabled', label: 'Push notifications', detail: 'Allow notifications on this device' },
  { key: 'messages', label: 'Messages' },
  { key: 'message_previews', label: 'Message previews', detail: 'Show message text on your lock screen' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'replies', label: 'Replies' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'follows', label: 'New followers' },
  { key: 'follow_requests', label: 'Follow requests' },
];

export default function NotificationSettings() {
  const client = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void fetchNotificationPreferences().then(result => {
      if (result.success) setPreferences(result.data);
      else Alert.alert('Notifications', 'Your notification settings are unavailable right now.');
      setLoading(false);
    });
  }, []);
  const toggle = async (key: ToggleKey, enabled: boolean) => {
    if (!preferences) return;
    const optimistic = { ...preferences, [key]: enabled } as NotificationPreferences;
    setPreferences(optimistic);
    const result = await updateNotificationPreferences({ [key]: enabled });
    if (!result.success) {
      setPreferences(preferences);
      Alert.alert('Notifications', 'Could not save that setting. Please try again.');
      return;
    }
    setPreferences(result.data);
    client.setQueryData(['notifications', 'preferences'], result.data);
    if (key === 'push_enabled') {
      const registration = enabled ? await registerPushToken() : (await unregisterPushToken(), { success: true as const });
      if (!registration.success) Alert.alert('Notifications', 'The preference was saved, but this device could not be registered for push notifications.');
    }
  };
  if (loading) return <ScreenWrapper bg="white"><View style={styles.center}><Loading /></View></ScreenWrapper>;
  if (!preferences) return <ScreenWrapper bg="white"><View style={styles.center}><Text style={styles.empty}>Notification settings are unavailable.</Text></View></ScreenWrapper>;
  return <ScreenWrapper bg="white"><View style={styles.container}><Header title="Notifications" /><ScrollView contentContainerStyle={styles.list}>
    <Text style={styles.section}>Push notifications</Text>
    {labels.map(item => <View key={item.key} style={styles.row}><View style={styles.copy}><Text style={styles.label}>{item.label}</Text>{item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}</View><Switch value={preferences[item.key]} onValueChange={value => { void toggle(item.key, value); }} trackColor={{ true: theme.colors.primary }} /></View>)}
  </ScrollView></View></ScreenWrapper>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: theme.colors.textLight },
  list: { paddingVertical: 14 },
  section: { color: theme.colors.textLight, fontSize: 13, fontWeight: theme.fonts.semibold as '600', textTransform: 'uppercase', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomColor: theme.colors.gray, borderBottomWidth: StyleSheet.hairlineWidth },
  copy: { flex: 1 },
  label: { color: theme.colors.textDark, fontSize: 16 },
  detail: { color: theme.colors.textLight, fontSize: 12, marginTop: 2 },
});

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { providerConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/result';
import { toServiceError } from '@/types/result';

const DEVICE_ID_KEY = 'linkup.pushDeviceId.v1';
export const NOTIFICATION_CHANNELS = { messages: 'messages', social: 'social-activity', general: 'general' } as const;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
});

export async function configureNotificationChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.messages, { name: 'Messages', description: 'New direct messages', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 180, 120, 180], showBadge: true }),
    Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.social, { name: 'Social activity', description: 'Likes, comments, follows, and mentions', importance: Notifications.AndroidImportance.DEFAULT, showBadge: true }),
    Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.general, { name: 'General', description: 'General LinkUp updates', importance: Notifications.AndroidImportance.LOW, showBadge: true }),
  ]);
}

async function installationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
}

function easProjectId() {
  const fromConfig = Constants.expoConfig?.extra?.eas;
  const configured = fromConfig && typeof fromConfig === 'object' && typeof (fromConfig as { projectId?: unknown }).projectId === 'string' ? (fromConfig as { projectId: string }).projectId : undefined;
  return providerConfig.projectId || Constants.easConfig?.projectId || configured;
}

export async function registerPushToken(): Promise<ServiceResult<void>> {
  if (Platform.OS === 'web') return { success: true, data: undefined };
  try {
    await configureNotificationChannels();
    const current = await Notifications.getPermissionsAsync();
    const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') return { success: false, error: { code: 'notAllowed', message: 'Notification permission was not granted', retryable: false } };
    const projectId = easProjectId();
    if (!projectId) return { success: false, error: { code: 'invalidData', message: 'EAS project ID is required for push notifications', retryable: false } };
    const [{ data: token }, deviceId] = await Promise.all([Notifications.getExpoPushTokenAsync({ projectId }), installationId()]);
    const { error } = await supabase.rpc('register_push_token', { p_device_id: deviceId, p_token: token, p_platform: Platform.OS });
    if (error) throw error;
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: toServiceError(error) };
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (deviceId) await supabase.rpc('unregister_push_token', { p_device_id: deviceId });
  } catch {
    // Sign-out must not be blocked by local or network cleanup failures.
  }
}

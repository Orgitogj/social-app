import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { configureNotificationChannels, registerPushToken } from '@/services/pushService';

export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    void configureNotificationChannels();
    if (!enabled) return;
    void registerPushToken();
    const tokenListener = Notifications.addPushTokenListener(() => { void registerPushToken(); });
    return () => tokenListener.remove();
  }, [enabled]);
}

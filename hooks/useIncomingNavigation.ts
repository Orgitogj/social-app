import { useCallback, useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { destinationFromNotification, destinationFromUrl, destinationHref, storePendingDestination, takePendingDestination, type AppDestination } from '@/lib/deepLinking';

export function useIncomingNavigation(ready: boolean, authenticated: boolean) {
  const router = useRouter();
  const route = useCallback(async (destination: AppDestination) => {
    if (!ready || !authenticated) {
      await storePendingDestination(destination);
      return;
    }
    router.push(destinationHref(destination));
  }, [authenticated, ready, router]);

  useEffect(() => {
    const consumeUrl = (url: string) => {
      const destination = destinationFromUrl(url);
      if (destination) void route(destination);
    };
    void Linking.getInitialURL().then(url => { if (url) consumeUrl(url); });
    const urlSubscription = Linking.addEventListener('url', event => consumeUrl(event.url));
    const consumeNotification = (notification: Notifications.Notification) => {
      const destination = destinationFromNotification(notification.request.content.data);
      if (destination) void route(destination);
    };
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      consumeNotification(lastResponse.notification);
      Notifications.clearLastNotificationResponse();
    }
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => consumeNotification(response.notification));
    return () => {
      urlSubscription.remove();
      notificationSubscription.remove();
    };
  }, [route]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let active = true;
    void takePendingDestination().then(destination => {
      if (active && destination) router.push(destinationHref(destination));
    });
    return () => { active = false; };
  }, [authenticated, ready, router]);
}

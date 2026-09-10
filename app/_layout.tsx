import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '@/contexts/AuthContexts';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import type { User } from '@supabase/supabase-js';
import { getUserData } from '@/services/userService';
import { fetchNotificationPreferences, unreadNotificationCount } from '@/services/notificationsService';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useIncomingNavigation } from '@/hooks/useIncomingNavigation';
import { useUnreadMessageCount } from '@/hooks/useChat';

export default function RootLayout() {
  return <QueryClientProvider client={queryClient}><AuthProvider><MainLayout /></AuthProvider></QueryClientProvider>;
}

function MainLayout() {
  const { authUser, setAuth, setUserData } = useAuth();
  const [ready, setReady] = useState(false);
  const requestId = useRef(0);
  const router = useRouter();
  const segments = useSegments();
  const client = useQueryClient();
  const preferences = useQuery({
    queryKey: ['notifications', 'preferences'],
    enabled: Boolean(authUser),
    queryFn: async () => {
      const result = await fetchNotificationPreferences();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
  const unreadMessages = useUnreadMessageCount(authUser?.id);
  const unreadNotifications = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    enabled: Boolean(authUser),
    queryFn: async () => {
      const result = await unreadNotificationCount();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
  usePushRegistration(Boolean(authUser && preferences.data?.push_enabled));

  useEffect(() => {
    let active = true;
    const update = async (session: User | null) => {
      const currentRequest = ++requestId.current;
      if (session) {
        setAuth(session);
        const result = await getUserData(session.id);
        if (active && currentRequest === requestId.current && result.success) setUserData(result.data);
      } else {
        setAuth(null);
        setUserData(null);
        client.clear();
      }
      if (active && currentRequest === requestId.current) setReady(true);
    };
    void supabase.auth.getSession().then(({ data }) => update(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') void update(session?.user ?? null);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [client, setAuth, setUserData]);

  useEffect(() => {
    if (!ready) return;
    const inApp = segments[0] === 'main';
    if (inApp && !authUser) router.replace('/welcome');
    if (!authUser && (!segments.length || segments[0] === 'index')) router.replace('/welcome');
    if (!inApp && authUser) router.replace('/main/home');
  }, [authUser, ready, router, segments]);

  useIncomingNavigation(ready, Boolean(authUser));

  useEffect(() => {
    if (!authUser) return;
    const channel = supabase
      .channel(`notification-badge:${authUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `receiverId=eq.${authUser.id}` }, () => {
        void client.invalidateQueries({ queryKey: ['notifications', 'unreadCount'], exact: true });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [authUser, client]);

  useEffect(() => {
    if (!authUser) return;
    const count = (unreadMessages.data ?? 0) + (unreadNotifications.data ?? 0);
    void Notifications.setBadgeCountAsync(count).catch(() => undefined);
  }, [authUser, unreadMessages.data, unreadNotifications.data]);

  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="main/postDetails" options={{ presentation: 'modal' }} />
    <Stack.Screen name="main/chat" options={{ presentation: 'card' }} />
  </Stack>;
}

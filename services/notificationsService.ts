import { supabase } from '@/lib/supabase';
import type { Notification, NotificationPreferences } from '@/types/domain';
import type { ServiceResult } from '@/types/result';

export async function fetchNotifications(_receiverId: string): Promise<ServiceResult<Notification[]>> {
  const { data, error } = await supabase.rpc('get_notifications', { p_limit: 50 });
  return error ? { success: false, error: { code: 'networkError', message: 'Could not fetch notifications', retryable: true } } : { success: true, data: (data ?? []) as Notification[] };
}

export async function unreadNotificationCount(): Promise<ServiceResult<number>> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  return error ? { success: false, error: { code: 'networkError', message: 'Could not fetch unread notifications', retryable: true } } : { success: true, data: count ?? 0 };
}

export async function fetchNotificationPreferences(): Promise<ServiceResult<NotificationPreferences>> {
  const { data, error } = await supabase.from('notification_preferences').select('userId,push_enabled,messages,likes,comments,replies,mentions,follows,follow_requests,message_previews,updated_at').single();
  return error ? { success: false, error: { code: 'networkError', message: 'Could not fetch notification settings', retryable: true } } : { success: true, data: data as NotificationPreferences };
}

export async function updateNotificationPreferences(values: Partial<Omit<NotificationPreferences, 'userId' | 'updated_at'>>): Promise<ServiceResult<NotificationPreferences>> {
  const { data, error } = await supabase.from('notification_preferences').update(values).select('userId,push_enabled,messages,likes,comments,replies,mentions,follows,follow_requests,message_previews,updated_at').single();
  return error ? { success: false, error: { code: 'networkError', message: 'Could not save notification settings', retryable: true } } : { success: true, data: data as NotificationPreferences };
}

export async function markNotificationRead(id: string) { return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id); }
export async function markAllNotificationsRead() { return supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null); }
export async function createNotification(_notification?: unknown) { return { success: false as const, msg: 'Notifications are generated securely by the database' }; }

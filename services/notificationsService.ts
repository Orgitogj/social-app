import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types/domain';
import type { ServiceResult } from '@/types/result';

export async function fetchNotifications(_receiverId: string): Promise<ServiceResult<Notification[]>> {
  const { data, error } = await supabase.rpc('get_notifications', { p_limit: 50 });
  return error ? { success: false, error: { code: 'networkError', message: 'Could not fetch notifications', retryable: true } } : { success: true, data: (data ?? []) as Notification[] };
}

export async function unreadNotificationCount(): Promise<ServiceResult<number>> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  return error ? { success: false, error: { code: 'networkError', message: 'Could not fetch unread notifications', retryable: true } } : { success: true, data: count ?? 0 };
}

export async function markNotificationRead(id: string) { return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id); }
export async function markAllNotificationsRead() { return supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null); }
export async function createNotification(_notification?: unknown) { return { success: false as const, msg: 'Notifications are generated securely by the database' }; }

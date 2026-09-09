import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/domain';
import type { ServiceResult } from '@/types/result';

export async function getUserData(userId: string): Promise<ServiceResult<Profile>> {
  const { data, error } = await supabase.from('users').select('id,name,username,image,bio,location,is_private').eq('id', userId).single();
  return error ? { success: false, error: { code: 'notFound', message: 'Profile unavailable', retryable: false } } : { success: true, data: data as Profile };
}

export async function updateUser(userId: string, data: Partial<Profile>): Promise<ServiceResult<Profile>> {
  const safeData = { name: data.name, username: data.username ?? undefined, image: data.image ?? undefined, bio: data.bio ?? undefined, location: data.location ?? undefined, is_private: data.is_private ?? undefined };
  const { data: updated, error } = await supabase.from('users').update(safeData).eq('id', userId).select('id,name,username,image,bio,location,is_private').single();
  return error ? { success: false, error: { code: 'unknownError', message: 'Could not update profile', retryable: true } } : { success: true, data: updated as Profile };
}

export async function searchUsers(searchText: string, excludeUserId?: string): Promise<ServiceResult<Profile[]>> {
  const { data, error } = await supabase.rpc('search_users', { p_query: searchText, p_limit: 20, p_suggestions: false });
  return error ? { success: false, error: { code: 'networkError', message: 'Could not search users', retryable: true } } : { success: true, data: (data ?? []).filter(item => item.id !== excludeUserId) as Profile[] };
}

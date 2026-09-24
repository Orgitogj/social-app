import { supabase } from '@/lib/supabase';
import { deduplicate, type Cursor, type Page } from '@/helpers/pagination';
import { uuidSchema } from '@/helpers/validation';
import type { CloseFriend, CloseFriendCandidate, Profile } from '@/types/domain';
import { toServiceError, type ServiceResult } from '@/types/result';

export const CLOSE_FRIENDS_PAGE_SIZE = 30;

function resultFromError(error: unknown): ServiceResult<never> {
  return { success: false, error: toServiceError(error) };
}

function parseProfile(value: unknown): Profile | null {
  if (!value || typeof value !== 'object') return null;
  const user = value as Record<string, unknown>;
  if (typeof user.id !== 'string' || typeof user.name !== 'string') return null;
  return { id: user.id, name: user.name, username: typeof user.username === 'string' ? user.username : null, image: typeof user.image === 'string' ? user.image : null };
}

export function parseCloseFriend(value: unknown): CloseFriend | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const user = parseProfile(row.user);
  if (typeof row.id !== 'string' || typeof row.friend_id !== 'string' || typeof row.created_at !== 'string' || !user) return null;
  return { id: row.id, friend_id: row.friend_id, created_at: row.created_at, user };
}

export function parseCloseFriendCandidate(value: unknown): CloseFriendCandidate | null {
  const user = parseProfile(value);
  if (!user) return null;
  return { ...user, is_close_friend: (value as Record<string, unknown>).is_close_friend === true };
}

export async function fetchCloseFriends(cursor?: Cursor | null): Promise<ServiceResult<Page<CloseFriend>>> {
  const { data, error } = await supabase.rpc('get_close_friends', { p_before_time: cursor?.created_at, p_before_id: cursor?.id, p_limit: CLOSE_FRIENDS_PAGE_SIZE });
  if (error) return resultFromError(error);
  const items = deduplicate((data ?? []).map(parseCloseFriend).filter((item): item is CloseFriend => item !== null));
  const last = items.at(-1);
  return { success: true, data: { items, nextCursor: items.length === CLOSE_FRIENDS_PAGE_SIZE && last ? { created_at: last.created_at, id: last.id } : null } };
}

export async function searchCloseFriendCandidates(query: string, afterId?: string | null): Promise<ServiceResult<CloseFriendCandidate[]>> {
  const { data, error } = await supabase.rpc('search_close_friend_candidates', { p_query: query.trim().slice(0, 100), p_after_id: afterId ?? undefined, p_limit: CLOSE_FRIENDS_PAGE_SIZE });
  if (error) return resultFromError(error);
  return { success: true, data: (data ?? []).map(parseCloseFriendCandidate).filter((item): item is CloseFriendCandidate => item !== null) };
}

export async function addCloseFriend(ownerId: string, friendId: string): Promise<ServiceResult<void>> {
  const owner = uuidSchema.safeParse(ownerId);
  const friend = uuidSchema.safeParse(friendId);
  if (!owner.success) return resultFromError(owner.error);
  if (!friend.success) return resultFromError(friend.error);
  const { error } = await supabase.from('close_friends').insert({ owner_id: owner.data, friend_id: friend.data });
  if (error && error.code !== '23505') return resultFromError(error);
  return { success: true, data: undefined };
}

export async function removeCloseFriend(ownerId: string, friendId: string): Promise<ServiceResult<void>> {
  const owner = uuidSchema.safeParse(ownerId);
  const friend = uuidSchema.safeParse(friendId);
  if (!owner.success) return resultFromError(owner.error);
  if (!friend.success) return resultFromError(friend.error);
  const { error } = await supabase.from('close_friends').delete().eq('owner_id', owner.data).eq('friend_id', friend.data);
  return error ? resultFromError(error) : { success: true, data: undefined };
}

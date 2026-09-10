import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import { z } from 'zod';
import { uuidSchema } from '@/helpers/validation';

const PENDING_DESTINATION_KEY = 'linkup.pendingDestination.v1';
const destinationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('profile'), userId: uuidSchema }),
  z.object({ kind: z.literal('post'), postId: uuidSchema }),
  z.object({ kind: z.literal('chat'), conversationId: uuidSchema }),
  z.object({ kind: z.literal('notifications') }),
]);
const notificationPayloadSchema = z.object({
  type: z.enum(['message', 'like', 'comment', 'reply', 'mention', 'follow', 'follow_request', 'follow_accepted']).optional(),
  conversationId: uuidSchema.optional(),
  postId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
}).passthrough();

export type AppDestination = z.infer<typeof destinationSchema>;

export function destinationFromNotification(data: unknown): AppDestination | null {
  const parsed = notificationPayloadSchema.safeParse(data);
  if (!parsed.success) return null;
  const payload = parsed.data;
  if (payload.type === 'message' && payload.conversationId) return { kind: 'chat', conversationId: payload.conversationId };
  if (['like', 'comment', 'reply', 'mention'].includes(payload.type ?? '') && payload.postId) return { kind: 'post', postId: payload.postId };
  if (['follow', 'follow_request', 'follow_accepted'].includes(payload.type ?? '') && payload.userId) return { kind: 'profile', userId: payload.userId };
  return null;
}

export function destinationFromUrl(url: string): AppDestination | null {
  const scheme = /^([a-z][a-z\d+.-]*):\/\//i.exec(url)?.[1];
  if (scheme && scheme !== 'supasocialapp') return null;
  const withoutScheme = url.includes('://') ? url.slice(url.indexOf('://') + 3) : url.replace(/^\/+/, '');
  const path = withoutScheme.split(/[?#]/, 1)[0];
  const segments = path.split('/').filter(Boolean).map(segment => decodeURIComponent(segment));
  if (segments.length === 1 && segments[0] === 'notifications') return { kind: 'notifications' };
  if (segments.length !== 2) return null;
  const [kind, id] = segments;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return null;
  if (kind === 'profile') return { kind: 'profile', userId: parsedId.data };
  if (kind === 'post') return { kind: 'post', postId: parsedId.data };
  if (kind === 'chat') return { kind: 'chat', conversationId: parsedId.data };
  return null;
}

export function destinationHref(destination: AppDestination): Href {
  if (destination.kind === 'profile') return { pathname: '/main/profile', params: { userId: destination.userId } } as Href;
  if (destination.kind === 'post') return { pathname: '/main/postDetails', params: { postId: destination.postId } } as Href;
  if (destination.kind === 'chat') return { pathname: '/main/chat', params: { conversationId: destination.conversationId } } as Href;
  return '/main/notifications' as Href;
}

export async function storePendingDestination(destination: AppDestination) {
  await AsyncStorage.setItem(PENDING_DESTINATION_KEY, JSON.stringify(destination));
}

export async function takePendingDestination(): Promise<AppDestination | null> {
  const raw = await AsyncStorage.getItem(PENDING_DESTINATION_KEY);
  await AsyncStorage.removeItem(PENDING_DESTINATION_KEY);
  if (!raw) return null;
  try {
    const parsed = destinationSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

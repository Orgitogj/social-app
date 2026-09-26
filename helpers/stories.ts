import type { z } from 'zod';
import type { imageMimeTypeSchema, videoMimeTypeSchema } from './validation';
import type { Story, StoryErrorCode, StoryRingState, StoryTrayItem, StoryViewState } from '@/types/domain';
import type { ServiceError } from '@/types/result';

export type StoryMimeType = z.infer<typeof imageMimeTypeSchema> | z.infer<typeof videoMimeTypeSchema>;

export const STORY_SIGNED_URL_TTL_SECONDS = 300;

const STORY_EXTENSIONS: Record<StoryMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

export const storyMediaPath = (userId: string, storyId: string, mimeType: StoryMimeType) => `${userId}/stories/${storyId}/media.${STORY_EXTENSIONS[mimeType]}`;
export const storyThumbnailPath = (userId: string, storyId: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp') => `${userId}/stories/${storyId}/thumbnail.${STORY_EXTENSIONS[mimeType]}`;

export function storySignedUrlTtl(expiresAt: string, now = Date.now()): number | null {
  const remaining = Math.floor((new Date(expiresAt).getTime() - now) / 1000);
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  return Math.min(STORY_SIGNED_URL_TTL_SECONDS, remaining);
}

const MIME_ALIASES: Record<string, string> = { 'image/jpg': 'image/jpeg', 'image/pjpeg': 'image/jpeg', 'video/mov': 'video/quicktime', 'video/x-m4v': 'video/mp4', 'video/m4v': 'video/mp4' };
const EXTENSION_MIME_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp' };

export function normalizeStoryMimeType(mimeType?: string | null, uri?: string | null): string {
  const declared = mimeType?.trim().toLowerCase();
  if (declared) return MIME_ALIASES[declared] ?? declared;
  const extension = uri?.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  return (extension && EXTENSION_MIME_TYPES[extension]) || 'application/octet-stream';
}

const STORY_ERROR_CODES: readonly StoryErrorCode[] = ['unsupportedMedia', 'mediaTooLarge', 'videoTooLong', 'videoTooShort', 'captionTooLong', 'invalidAudience', 'invalidMedia', 'noCloseFriends', 'permissionDenied', 'uploadFailed', 'publishFailed', 'rateLimited', 'storyUnavailable'];

export function isStoryErrorCode(value: unknown): value is StoryErrorCode {
  return typeof value === 'string' && (STORY_ERROR_CODES as readonly string[]).includes(value);
}

export function storyErrorFromIssues(error: z.ZodError): StoryErrorCode {
  const message = error.issues[0]?.message;
  return isStoryErrorCode(message) ? message : 'invalidMedia';
}

export function storyErrorFromService(error: ServiceError, fallback: StoryErrorCode): StoryErrorCode {
  if (isStoryErrorCode(error.message)) return error.message;
  if (error.code === 'rateLimited') return 'rateLimited';
  if (error.code === 'notAllowed' || error.code === 'notFound') return fallback === 'publishFailed' ? 'publishFailed' : 'storyUnavailable';
  return fallback;
}

const STORY_ERROR_MESSAGES: Record<StoryErrorCode, string> = {
  unsupportedMedia: 'This file type is not supported. Choose a JPEG, PNG, WebP or HEIC photo, or an MP4, MOV or WebM video.',
  mediaTooLarge: 'This file is too large. Photos can be up to 10 MB and videos up to 50 MB.',
  videoTooLong: 'Videos can be up to 60 seconds long. Trim the video and try again.',
  videoTooShort: 'Videos must be at least 1 second long.',
  captionTooLong: 'Captions can be up to 500 characters.',
  invalidAudience: 'Choose who can see this story.',
  invalidMedia: 'This media could not be read. Try another photo or video.',
  noCloseFriends: 'Your Close Friends list is empty, so nobody would see this story. Share it with followers instead.',
  permissionDenied: 'Permission is required to continue. You can allow access in Settings.',
  uploadFailed: 'Upload failed. Check your connection and try again.',
  publishFailed: 'Your story could not be published. Try again.',
  rateLimited: 'You are posting too quickly. Wait a moment and try again.',
  storyUnavailable: 'This story is no longer available.',
};

export const storyErrorMessage = (code: StoryErrorCode) => STORY_ERROR_MESSAGES[code];

export const isStoryExpired = (story: Pick<Story, 'expires_at'>, now = Date.now()) => !(new Date(story.expires_at).getTime() > now);

export function storyViewState(stories: readonly Pick<Story, 'viewed'>[]): StoryViewState {
  const viewed = stories.filter(story => story.viewed).length;
  if (viewed === 0) return 'none';
  return viewed === stories.length ? 'all' : 'partial';
}

export function storyRingState(item?: Pick<StoryTrayItem, 'story_count' | 'unviewed_count' | 'is_own'> | null): StoryRingState {
  if (!item || item.story_count <= 0) return 'none';
  if (item.is_own) return 'unviewed';
  return item.unviewed_count > 0 ? 'unviewed' : 'viewed';
}

export function compareStoryTrayItems(a: StoryTrayItem, b: StoryTrayItem): number {
  if (a.is_own !== b.is_own) return a.is_own ? -1 : 1;
  if (Boolean(a.muted) !== Boolean(b.muted)) return a.muted ? 1 : -1;
  const aUnviewed = a.unviewed_count > 0;
  const bUnviewed = b.unviewed_count > 0;
  if (aUnviewed !== bUnviewed) return aUnviewed ? -1 : 1;
  return b.latest_story_at.localeCompare(a.latest_story_at) || a.author.id.localeCompare(b.author.id);
}

export function orderStoryTray(items: readonly StoryTrayItem[]): StoryTrayItem[] {
  const unique = new Map<string, StoryTrayItem>();
  for (const item of items) if (item.story_count > 0 && !unique.has(item.author.id)) unique.set(item.author.id, item);
  return [...unique.values()].sort(compareStoryTrayItems);
}

export function firstUnviewedIndex(stories: readonly Pick<Story, 'viewed'>[]): number {
  const index = stories.findIndex(story => !story.viewed);
  return index === -1 ? 0 : index;
}

export function markStoryViewed(stories: Story[] | undefined, storyId: string): Story[] | undefined {
  if (!stories?.some(story => story.id === storyId && !story.viewed)) return stories;
  return stories.map(story => story.id === storyId ? { ...story, viewed: true } : story);
}

export function markTrayStoryViewed(items: StoryTrayItem[] | undefined, authorId: string): StoryTrayItem[] | undefined {
  if (!items?.some(item => item.author.id === authorId && item.unviewed_count > 0)) return items;
  return items.map(item => item.author.id === authorId ? { ...item, unviewed_count: item.unviewed_count - 1 } : item);
}

export function fitWithin(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function nextTrayExpiry(items: readonly Pick<StoryTrayItem, 'next_expires_at'>[] | undefined, now = Date.now()): number | null {
  let soonest: number | null = null;
  for (const item of items ?? []) {
    const remaining = item.next_expires_at ? new Date(item.next_expires_at).getTime() - now : NaN;
    if (Number.isFinite(remaining) && remaining > 0 && (soonest === null || remaining < soonest)) soonest = remaining;
  }
  return soonest === null ? null : Math.min(soonest + 1000, 2_147_483_647);
}

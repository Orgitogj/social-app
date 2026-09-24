import type { z } from 'zod';
import type { imageMimeTypeSchema, videoMimeTypeSchema } from './validation';
import type { StoryErrorCode } from '@/types/domain';
import type { ServiceError } from '@/types/result';

export type StoryMimeType = z.infer<typeof imageMimeTypeSchema> | z.infer<typeof videoMimeTypeSchema>;

// Signed story URLs are short-lived bearer links: access revoked by a block,
// unfollow, or Close Friends removal lapses within this window at most.
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

// Mirrors the uploads_story_create policy and stories path constraints:
// {author}/stories/{story}/media.{ext} and {author}/stories/{story}/thumbnail.{ext}.
export const storyMediaPath = (userId: string, storyId: string, mimeType: StoryMimeType) => `${userId}/stories/${storyId}/media.${STORY_EXTENSIONS[mimeType]}`;
export const storyThumbnailPath = (userId: string, storyId: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp') => `${userId}/stories/${storyId}/thumbnail.${STORY_EXTENSIONS[mimeType]}`;

// A signed URL never outlives the story it belongs to. Null means the story is
// already expired by this clock; the server remains the authority either way.
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

import type { z } from 'zod';
import type { imageMimeTypeSchema, videoMimeTypeSchema } from './validation';

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

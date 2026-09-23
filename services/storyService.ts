import type { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET } from '@/constants';
import { storyMediaPath, storySignedUrlTtl, storyThumbnailPath, type StoryMimeType } from '@/helpers/stories';
import { storyAudienceSchema, storyInputSchema, storyMediaTypeSchema, uuidSchema } from '@/helpers/validation';
import { uploadFileToPath } from '@/services/imageService';
import type { Story, StoryAudience } from '@/types/domain';
import { toServiceError, type ServiceResult } from '@/types/result';

export type StoryInput = z.input<typeof storyInputSchema>;

function resultFromError(error: unknown): ServiceResult<never> {
  return { success: false, error: toServiceError(error) };
}

const invalidStory: ServiceResult<never> = { success: false, error: { code: 'invalidData', message: 'Invalid story response', retryable: false } };

export function parseStory(value: unknown): Story | null {
  if (!value || typeof value !== 'object') return null;
  const story = value as Record<string, unknown>;
  const mediaType = storyMediaTypeSchema.safeParse(story.media_type);
  const audience = storyAudienceSchema.safeParse(story.audience);
  if (typeof story.id !== 'string' || typeof story.author_id !== 'string' || typeof story.media_path !== 'string' || typeof story.mime_type !== 'string'
    || typeof story.width !== 'number' || typeof story.height !== 'number' || typeof story.created_at !== 'string' || typeof story.expires_at !== 'string'
    || !mediaType.success || !audience.success) return null;
  const author = story.author && typeof story.author === 'object' ? story.author as Record<string, unknown> : null;
  return {
    id: story.id,
    author_id: story.author_id,
    media_type: mediaType.data,
    media_path: story.media_path,
    mime_type: story.mime_type,
    thumbnail_path: typeof story.thumbnail_path === 'string' ? story.thumbnail_path : null,
    width: story.width,
    height: story.height,
    duration: typeof story.duration === 'number' ? story.duration : null,
    caption: typeof story.caption === 'string' ? story.caption : null,
    audience: audience.data,
    created_at: story.created_at,
    expires_at: story.expires_at,
    author: author && typeof author.id === 'string' && typeof author.name === 'string'
      ? { id: author.id, name: author.name, username: typeof author.username === 'string' ? author.username : null, image: typeof author.image === 'string' ? author.image : null }
      : undefined,
  };
}

// Uploads go to the story's own folder; publishing must use the same story id.
export async function uploadStoryMedia(userId: string, storyId: string, fileUri: string, mimeType: StoryMimeType): Promise<ServiceResult<string>> {
  const user = uuidSchema.safeParse(userId);
  const story = uuidSchema.safeParse(storyId);
  if (!user.success || !story.success || !fileUri) return { success: false, error: { code: 'invalidData', message: 'Invalid story upload', retryable: false } };
  const upload = await uploadFileToPath(storyMediaPath(user.data, story.data, mimeType), fileUri, mimeType);
  return upload.success && upload.data ? { success: true, data: upload.data } : { success: false, error: { code: 'networkError', message: upload.msg ?? 'Upload failed', retryable: true } };
}

export async function uploadStoryThumbnail(userId: string, storyId: string, fileUri: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'): Promise<ServiceResult<string>> {
  const user = uuidSchema.safeParse(userId);
  const story = uuidSchema.safeParse(storyId);
  if (!user.success || !story.success || !fileUri) return { success: false, error: { code: 'invalidData', message: 'Invalid story upload', retryable: false } };
  const upload = await uploadFileToPath(storyThumbnailPath(user.data, story.data, mimeType), fileUri, mimeType);
  return upload.success && upload.data ? { success: true, data: upload.data } : { success: false, error: { code: 'networkError', message: upload.msg ?? 'Upload failed', retryable: true } };
}

export async function publishStory(input: StoryInput): Promise<ServiceResult<Story>> {
  const parsed = storyInputSchema.safeParse(input);
  if (!parsed.success) return resultFromError(parsed.error);
  const value = parsed.data;
  const { data, error } = await supabase.rpc('create_story', {
    p_id: value.id,
    p_media_type: value.mediaType,
    p_media_path: value.mediaPath,
    p_mime_type: value.mimeType,
    p_width: value.width,
    p_height: value.height,
    p_duration: value.duration ?? null,
    p_thumbnail_path: value.thumbnailPath ?? null,
    p_caption: value.caption ?? null,
    p_audience: value.audience,
  });
  if (error) return resultFromError(error);
  const story = parseStory(data);
  return story ? { success: true, data: story } : invalidStory;
}

export async function fetchActiveStories(authorId: string): Promise<ServiceResult<Story[]>> {
  const author = uuidSchema.safeParse(authorId);
  if (!author.success) return resultFromError(author.error);
  const { data, error } = await supabase.rpc('get_active_stories', { p_author_id: author.data });
  if (error) return resultFromError(error);
  return { success: true, data: (data ?? []).map(parseStory).filter((story): story is Story => story !== null) };
}

export async function updateStoryAudience(storyId: string, audience: StoryAudience): Promise<ServiceResult<void>> {
  const story = uuidSchema.safeParse(storyId);
  const value = storyAudienceSchema.safeParse(audience);
  if (!story.success) return resultFromError(story.error);
  if (!value.success) return resultFromError(value.error);
  const { error } = await supabase.from('stories').update({ audience: value.data }).eq('id', story.data);
  return error ? resultFromError(error) : { success: true, data: undefined };
}

export async function deleteStory(storyId: string): Promise<ServiceResult<void>> {
  const story = uuidSchema.safeParse(storyId);
  if (!story.success) return resultFromError(story.error);
  const { error } = await supabase.from('stories').delete().eq('id', story.data);
  return error ? resultFromError(error) : { success: true, data: undefined };
}

// Storage signs only objects the caller may read under story authorization,
// and the link lifetime is capped by both the TTL and the story's expiry.
export async function getStoryMediaUrl(path: string, expiresAt: string): Promise<ServiceResult<string>> {
  const ttl = storySignedUrlTtl(expiresAt);
  if (!path || ttl === null) return { success: false, error: { code: 'notFound', message: 'Story unavailable', retryable: false } };
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, ttl);
  return error || !data?.signedUrl
    ? { success: false, error: { code: 'notFound', message: 'Story unavailable', retryable: false } }
    : { success: true, data: data.signedUrl };
}

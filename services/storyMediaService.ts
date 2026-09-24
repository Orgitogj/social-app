import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { STORY_IMAGE_MAX_DIMENSION, STORY_THUMBNAIL_MAX_DIMENSION } from '@/constants';
import { fitWithin, normalizeStoryMimeType, storyErrorFromIssues } from '@/helpers/stories';
import { imageMimeTypeSchema, storyDraftSchema, videoMimeTypeSchema } from '@/helpers/validation';
import type { StoryDraft, StoryErrorCode } from '@/types/domain';

export type StoryPreparation = { success: true; data: StoryDraft } | { success: false; error: StoryErrorCode };

export function localFileSize(uri: string): number | null {
  if (Platform.OS === 'web' || !uri.startsWith('file:')) return null;
  try {
    const file = new File(uri);
    return file.exists ? file.size : null;
  } catch {
    return null;
  }
}

export async function renderJpeg(uri: string, width: number, height: number, maxDimension: number, compress: number) {
  const context = ImageManipulator.manipulate(uri);
  const target = fitWithin(width, height, maxDimension);
  if (target.width !== width || target.height !== height) context.resize(target);
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress, format: SaveFormat.JPEG });
  return { uri: result.uri, width: result.width, height: result.height };
}

function validated(draft: StoryDraft): StoryPreparation {
  const parsed = storyDraftSchema.safeParse(draft);
  return parsed.success ? { success: true, data: draft } : { success: false, error: storyErrorFromIssues(parsed.error) };
}

export async function prepareStoryImage(asset: Pick<ImagePickerAsset, 'uri' | 'width' | 'height' | 'mimeType' | 'fileName'>): Promise<StoryPreparation> {
  const sourceMime = normalizeStoryMimeType(asset.mimeType, asset.fileName ?? asset.uri);
  if (!imageMimeTypeSchema.safeParse(sourceMime).success) return { success: false, error: 'unsupportedMedia' };
  if (!(asset.width > 0) || !(asset.height > 0)) return { success: false, error: 'invalidMedia' };
  try {
    const image = await renderJpeg(asset.uri, asset.width, asset.height, STORY_IMAGE_MAX_DIMENSION, 0.82);
    return validated({ mediaType: 'image', uri: image.uri, mimeType: 'image/jpeg', width: image.width, height: image.height, duration: null, fileSize: localFileSize(image.uri), thumbnailUri: null });
  } catch {
    return { success: false, error: 'invalidMedia' };
  }
}

async function createVideoThumbnail(uri: string): Promise<string | null> {
  try {
    const frame = await VideoThumbnails.getThumbnailAsync(uri, { time: 0, quality: 0.8 });
    const thumbnail = await renderJpeg(frame.uri, frame.width, frame.height, STORY_THUMBNAIL_MAX_DIMENSION, 0.75);
    return thumbnail.uri;
  } catch {
    return null;
  }
}

export async function prepareStoryVideo(asset: Pick<ImagePickerAsset, 'uri' | 'width' | 'height' | 'mimeType' | 'fileName' | 'fileSize' | 'duration'>): Promise<StoryPreparation> {
  const mimeType = normalizeStoryMimeType(asset.mimeType, asset.fileName ?? asset.uri);
  if (!videoMimeTypeSchema.safeParse(mimeType).success) return { success: false, error: 'unsupportedMedia' };
  const duration = typeof asset.duration === 'number' && asset.duration > 0 ? Math.round(asset.duration) / 1000 : null;
  const fileSize = asset.fileSize ?? localFileSize(asset.uri);
  const precheck = storyDraftSchema.safeParse({ mediaType: 'video', uri: asset.uri, mimeType, width: Math.max(1, Math.round(asset.width)), height: Math.max(1, Math.round(asset.height)), duration, fileSize, thumbnailUri: null });
  if (!precheck.success) return { success: false, error: storyErrorFromIssues(precheck.error) };
  return validated({ ...precheck.data, thumbnailUri: await createVideoThumbnail(asset.uri) });
}

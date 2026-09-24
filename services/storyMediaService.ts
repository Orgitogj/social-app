import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { STORY_IMAGE_MAX_DIMENSION } from '@/constants';
import { fitWithin, normalizeStoryMimeType, storyErrorFromIssues } from '@/helpers/stories';
import { imageMimeTypeSchema, storyDraftSchema } from '@/helpers/validation';
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

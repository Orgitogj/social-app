import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { STORY_IMAGE_MAX_DIMENSION, STORY_SOURCE_MAX_PIXELS, STORY_THUMBNAIL_MAX_DIMENSION, STORY_VIDEO_MAX_DURATION } from '@/constants';
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

export function isPlayableVideoType(mimeType: string, platform: string = Platform.OS) {
  return !(platform === 'ios' && mimeType === 'video/webm');
}

export function deleteCachedFile(uri: string | null | undefined) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith(Paths.cache.uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    return;
  }
}

function validated(draft: StoryDraft): StoryPreparation {
  const parsed = storyDraftSchema.safeParse(draft);
  return parsed.success ? { success: true, data: draft } : { success: false, error: storyErrorFromIssues(parsed.error) };
}

export async function prepareStoryImage(asset: Pick<ImagePicker.ImagePickerAsset, 'uri' | 'width' | 'height' | 'mimeType' | 'fileName'>): Promise<StoryPreparation> {
  const sourceMime = normalizeStoryMimeType(asset.mimeType, asset.fileName ?? asset.uri);
  if (!imageMimeTypeSchema.safeParse(sourceMime).success) return { success: false, error: 'unsupportedMedia' };
  if (!(asset.width > 0) || !(asset.height > 0)) return { success: false, error: 'invalidMedia' };
  if (asset.width * asset.height > STORY_SOURCE_MAX_PIXELS) return { success: false, error: 'mediaTooLarge' };
  try {
    const image = await renderJpeg(asset.uri, asset.width, asset.height, STORY_IMAGE_MAX_DIMENSION, 0.82);
    const result = validated({ mediaType: 'image', uri: image.uri, mimeType: 'image/jpeg', width: image.width, height: image.height, duration: null, fileSize: localFileSize(image.uri), thumbnailUri: null });
    if (!result.success) deleteCachedFile(image.uri);
    return result;
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

export async function prepareStoryVideo(asset: Pick<ImagePicker.ImagePickerAsset, 'uri' | 'width' | 'height' | 'mimeType' | 'fileName' | 'fileSize' | 'duration'>): Promise<StoryPreparation> {
  const mimeType = normalizeStoryMimeType(asset.mimeType, asset.fileName ?? asset.uri);
  if (!videoMimeTypeSchema.safeParse(mimeType).success || !isPlayableVideoType(mimeType)) return { success: false, error: 'unsupportedMedia' };
  const duration = typeof asset.duration === 'number' && asset.duration > 0 ? Math.round(asset.duration) / 1000 : null;
  const fileSize = asset.fileSize ?? localFileSize(asset.uri);
  const precheck = storyDraftSchema.safeParse({ mediaType: 'video', uri: asset.uri, mimeType, width: Math.max(1, Math.round(asset.width)), height: Math.max(1, Math.round(asset.height)), duration, fileSize, thumbnailUri: null });
  if (!precheck.success) return { success: false, error: storyErrorFromIssues(precheck.error) };
  return validated({ ...precheck.data, thumbnailUri: await createVideoThumbnail(asset.uri) });
}

export type StoryMediaSource = 'camera' | 'library';
export type StoryMediaSelection = { status: 'selected'; asset: ImagePicker.ImagePickerAsset } | { status: 'cancelled' } | { status: 'denied'; canAskAgain: boolean } | { status: 'unavailable' };

const storyPickerOptions: ImagePicker.ImagePickerOptions = { mediaTypes: ['images', 'videos'], allowsEditing: false, allowsMultipleSelection: false, quality: 1, exif: false, videoMaxDuration: STORY_VIDEO_MAX_DURATION };

export async function ensureCameraPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return { granted: true, canAskAgain: true };
  if (!current.canAskAgain) return { granted: false, canAskAgain: false };
  const requested = await ImagePicker.requestCameraPermissionsAsync();
  return { granted: requested.granted, canAskAgain: requested.canAskAgain };
}

export async function selectStoryMedia(source: StoryMediaSource): Promise<StoryMediaSelection> {
  try {
    if (source === 'camera') {
      const permission = await ensureCameraPermission();
      if (!permission.granted) return { status: 'denied', canAskAgain: permission.canAskAgain };
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(storyPickerOptions) : await ImagePicker.launchImageLibraryAsync(storyPickerOptions);
    const asset = result.canceled ? null : result.assets[0];
    return asset ? { status: 'selected', asset } : { status: 'cancelled' };
  } catch {
    return { status: 'unavailable' };
  }
}

export function prepareStoryAsset(asset: ImagePicker.ImagePickerAsset): Promise<StoryPreparation> {
  const mimeType = normalizeStoryMimeType(asset.mimeType, asset.fileName ?? asset.uri);
  const isVideo = asset.type === 'video' || asset.type === 'pairedVideo' || (!asset.type && mimeType.startsWith('video/'));
  return isVideo ? prepareStoryVideo(asset) : prepareStoryImage(asset);
}

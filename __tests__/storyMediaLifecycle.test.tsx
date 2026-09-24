import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { deleteCachedFile, isPlayableVideoType, prepareStoryImage, prepareStoryVideo, releaseStoryDraft } from '@/services/storyMediaService';
import { getStoryMediaUrl, isTransientStorageError } from '@/services/storyService';
import { isTransientMediaError, shouldRefreshMedia, MEDIA_REFRESH_INTERVAL_MS } from '@/components/stories/StoryPlayer';
import StoryVideo from '@/components/stories/StoryVideo';
import { AppError } from '@/types/result';
import type { Story } from '@/types/domain';

const mockResize = jest.fn();
const mockManipulate = jest.fn();
const mockThumbnail = jest.fn();
const mockDelete = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockPlayer = { play: jest.fn(), pause: jest.fn(), currentTime: 0, duration: 10, loop: false, timeUpdateEventInterval: 0 };
const mockHandlers: Record<string, (payload: unknown) => void> = {};

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: (...args: unknown[]) => mockManipulate(...args) },
}));
jest.mock('expo-video-thumbnails', () => ({ getThumbnailAsync: (...args: unknown[]) => mockThumbnail(...args) }));
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache/' } },
  File: jest.fn().mockImplementation((uri: string) => ({ uri, exists: true, size: 400_000, delete: () => mockDelete(uri) })),
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ createSignedUrl: mockCreateSignedUrl }) } } }));
jest.mock('@/services/imageService', () => ({ uploadFileWithProgress: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('expo', () => ({ ...jest.requireActual('expo'), useEventListener: (_player: unknown, event: string, handler: (payload: unknown) => void) => { mockHandlers[event] = handler; } }));
jest.mock('expo-video', () => ({ useVideoPlayer: () => mockPlayer, VideoView: () => null }));

const story: Story = { id: 's', author_id: 'a', media_type: 'video', media_path: 'a/stories/s/media.mp4', mime_type: 'video/mp4', width: 1, height: 1, audience: 'followers', created_at: '2026-09-25T00:00:00Z', expires_at: '2099-01-01T00:00:00Z' };

beforeEach(() => {
  jest.clearAllMocks();
  mockManipulate.mockImplementation(() => ({
    resize: mockResize,
    renderAsync: async () => ({ saveAsync: async () => ({ uri: 'file:///cache/prepared.jpg', width: 1080, height: 1920 }) }),
  }));
  mockPlayer.currentTime = 0;
});

describe('image preparation', () => {
  it('resizes oversized images and re-encodes them as jpeg', async () => {
    const result = await prepareStoryImage({ uri: 'file:///cache/raw.heic', width: 4032, height: 3024, mimeType: 'image/heic', fileName: 'IMG.HEIC' });
    expect(result).toMatchObject({ success: true, data: { mimeType: 'image/jpeg', uri: 'file:///cache/prepared.jpg' } });
    expect(mockResize).toHaveBeenCalledWith({ width: 1920, height: 1440 });
  });

  it('does not upscale images within the limit', async () => {
    await prepareStoryImage({ uri: 'file:///cache/raw.jpg', width: 1080, height: 1350, mimeType: 'image/jpeg', fileName: null });
    expect(mockResize).not.toHaveBeenCalled();
  });

  it('rejects unsupported and unreasonably large sources before decoding', async () => {
    await expect(prepareStoryImage({ uri: 'file:///cache/a.gif', width: 100, height: 100, mimeType: 'image/gif', fileName: 'a.gif' })).resolves.toEqual({ success: false, error: 'unsupportedMedia' });
    await expect(prepareStoryImage({ uri: 'file:///cache/a.jpg', width: 20_000, height: 10_000, mimeType: 'image/jpeg', fileName: null })).resolves.toEqual({ success: false, error: 'mediaTooLarge' });
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it('reports undecodable images as invalid', async () => {
    mockManipulate.mockImplementationOnce(() => { throw new Error('decode'); });
    await expect(prepareStoryImage({ uri: 'file:///cache/a.jpg', width: 10, height: 10, mimeType: 'image/jpeg', fileName: null })).resolves.toEqual({ success: false, error: 'invalidMedia' });
  });
});

describe('video validation', () => {
  const video = { uri: 'file:///cache/v.mp4', width: 720, height: 1280, mimeType: 'video/mp4', fileName: 'v.mp4', fileSize: 5_000_000, duration: 12_000 };

  it('accepts a valid video and generates a thumbnail', async () => {
    mockThumbnail.mockResolvedValueOnce({ uri: 'file:///cache/frame.jpg', width: 720, height: 1280 });
    await expect(prepareStoryVideo(video)).resolves.toMatchObject({ success: true, data: { duration: 12, thumbnailUri: 'file:///cache/prepared.jpg' } });
  });

  it('keeps a valid video when thumbnail generation fails', async () => {
    mockThumbnail.mockRejectedValueOnce(new Error('codec'));
    await expect(prepareStoryVideo(video)).resolves.toMatchObject({ success: true, data: { thumbnailUri: null } });
  });

  it('rejects long, oversized, or unplayable videos', async () => {
    await expect(prepareStoryVideo({ ...video, duration: 61_000 })).resolves.toEqual({ success: false, error: 'videoTooLong' });
    await expect(prepareStoryVideo({ ...video, fileSize: 60 * 1024 * 1024 })).resolves.toEqual({ success: false, error: 'mediaTooLarge' });
    await expect(prepareStoryVideo({ ...video, mimeType: 'video/3gpp', fileName: 'v.3gp' })).resolves.toEqual({ success: false, error: 'unsupportedMedia' });
    expect(isPlayableVideoType('video/webm', 'ios')).toBe(false);
    expect(isPlayableVideoType('video/webm', 'android')).toBe(true);
  });
});

describe('prepared file cleanup', () => {
  it('deletes only generated cache files', () => {
    releaseStoryDraft({ mediaType: 'image', uri: 'file:///cache/prepared.jpg', mimeType: 'image/jpeg', width: 1, height: 1, duration: null, fileSize: 1, thumbnailUri: null });
    releaseStoryDraft({ mediaType: 'video', uri: 'file:///cache/picked.mp4', mimeType: 'video/mp4', width: 1, height: 1, duration: 3, fileSize: 1, thumbnailUri: 'file:///cache/thumb.jpg' });
    deleteCachedFile('file:///DCIM/original.jpg');
    expect(mockDelete.mock.calls.map(call => call[0])).toEqual(['file:///cache/prepared.jpg', 'file:///cache/thumb.jpg']);
  });
});

describe('signed media access', () => {
  it('separates transient failures from revoked or missing media', async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({ data: null, error: { name: 'StorageUnknownError' } });
    await expect(getStoryMediaUrl(story.media_path, story.expires_at)).resolves.toMatchObject({ success: false, error: { code: 'networkError', retryable: true } });
    mockCreateSignedUrl.mockResolvedValueOnce({ data: null, error: { name: 'StorageApiError', status: 400, message: 'Object not found' } });
    await expect(getStoryMediaUrl(story.media_path, story.expires_at)).resolves.toMatchObject({ success: false, error: { code: 'notFound', retryable: false } });
    mockCreateSignedUrl.mockRejectedValueOnce(new Error('offline'));
    await expect(getStoryMediaUrl(story.media_path, story.expires_at)).resolves.toMatchObject({ success: false, error: { code: 'networkError' } });
    mockCreateSignedUrl.mockResolvedValueOnce({ data: { signedUrl: 'https://signed' }, error: null });
    await expect(getStoryMediaUrl(story.media_path, story.expires_at)).resolves.toEqual({ success: true, data: 'https://signed' });
  });

  it('refreshes an expired link at most once per interval', () => {
    const now = 1_000_000;
    expect(shouldRefreshMedia(null, now)).toBe(true);
    expect(shouldRefreshMedia(now - 1000, now)).toBe(false);
    expect(shouldRefreshMedia(now - MEDIA_REFRESH_INTERVAL_MS - 1, now)).toBe(true);
    expect(isTransientMediaError(new AppError('networkError', true))).toBe(true);
    expect(isTransientMediaError(new AppError('notFound', false))).toBe(false);
    expect(isTransientStorageError({ status: 503 })).toBe(true);
    expect(isTransientStorageError({ status: 403 })).toBe(false);
  });
});

describe('visible video playback', () => {
  function renderVideo(overrides: Partial<React.ComponentProps<typeof StoryVideo>> = {}) {
    const props = { story, url: 'https://signed/video', startAt: 0, paused: false, progress: new Animated.Value(0), description: 'Video story', onViewed: jest.fn(), onComplete: jest.fn(), onMediaError: jest.fn(), ...overrides };
    return { ...render(<StoryVideo {...props} />), props };
  }

  it('plays only once ready and pauses when the viewer pauses', () => {
    const view = renderVideo();
    expect(mockPlayer.play).not.toHaveBeenCalled();
    mockHandlers.statusChange({ status: 'readyToPlay' });
    view.rerender(<StoryVideo {...view.props} />);
    expect(mockPlayer.play).toHaveBeenCalled();
    view.rerender(<StoryVideo {...view.props} paused />);
    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  it('resumes a refreshed video at its previous position', () => {
    renderVideo({ startAt: 7.5 });
    mockHandlers.statusChange({ status: 'readyToPlay' });
    expect(mockPlayer.currentTime).toBe(7.5);
  });

  it('reports load failures with the playback position', () => {
    const { props } = renderVideo();
    mockPlayer.currentTime = 4;
    mockHandlers.statusChange({ status: 'error' });
    expect(props.onMediaError).toHaveBeenCalledWith(4);
  });

  it('counts a view after the threshold and completes once', () => {
    const { props } = renderVideo();
    mockHandlers.timeUpdate({ currentTime: 0.5 });
    expect(props.onViewed).not.toHaveBeenCalled();
    mockHandlers.timeUpdate({ currentTime: 1.1 });
    mockHandlers.playToEnd(undefined);
    mockHandlers.playToEnd(undefined);
    expect(props.onViewed).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });
});

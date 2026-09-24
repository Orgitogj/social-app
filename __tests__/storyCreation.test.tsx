import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { StoryDraft } from '@/types/domain';
import { createStory, discardStoryUploads } from '@/services/storyService';
import { useStoryComposer } from '@/hooks/useStoryComposer';

const mockRpc = jest.fn();
const mockMaybeSingle = jest.fn();
const mockRemove = jest.fn();
const mockUpload = jest.fn();
const mockSelectStoryMedia = jest.fn();
const mockPrepareStoryAsset = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }),
    storage: { from: () => ({ remove: mockRemove, createSignedUrl: jest.fn() }) },
  },
}));
jest.mock('@/services/imageService', () => ({ uploadFileWithProgress: (...args: unknown[]) => mockUpload(...args) }));
jest.mock('@/services/storyMediaService', () => ({
  selectStoryMedia: (...args: unknown[]) => mockSelectStoryMedia(...args),
  prepareStoryAsset: (...args: unknown[]) => mockPrepareStoryAsset(...args),
}));
jest.mock('expo-crypto', () => {
  let counter = 0;
  return { randomUUID: () => `d49d3be3-82e9-4a96-ae64-a868d7ddc2${String(++counter).padStart(2, '0')}` };
});
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));

const userId = 'a49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const storyId = 'c49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const image: StoryDraft = { mediaType: 'image', uri: 'file:///cache/story.jpg', mimeType: 'image/jpeg', width: 1080, height: 1920, duration: null, fileSize: 500_000, thumbnailUri: null };
const video: StoryDraft = { mediaType: 'video', uri: 'file:///cache/story.mp4', mimeType: 'video/mp4', width: 720, height: 1280, duration: 8.5, fileSize: 4_000_000, thumbnailUri: 'file:///cache/thumb.jpg' };
const storyDocument = (id: string, mediaPath: string) => ({ id, author_id: userId, media_type: 'image', media_path: mediaPath, mime_type: 'image/jpeg', width: 1080, height: 1920, duration: null, caption: null, audience: 'followers', created_at: '2026-09-24T10:00:00Z', expires_at: '2026-09-25T10:00:00Z' });

beforeEach(() => {
  jest.clearAllMocks();
  mockUpload.mockImplementation(async (path: string, _uri: string, _mime: string, onProgress?: (value: number) => void) => {
    onProgress?.(0.5);
    onProgress?.(1);
    return { success: true, path, existed: false };
  });
  mockRpc.mockImplementation(async (_name: string, args: { p_id: string; p_media_path: string }) => ({ data: storyDocument(args.p_id, args.p_media_path), error: null }));
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockRemove.mockResolvedValue({ error: null });
});

describe('createStory', () => {
  it('uploads into the protected story folder and publishes', async () => {
    const stages: string[] = [];
    const progress: number[] = [];
    const result = await createStory(userId, storyId, image, { caption: '  hi  ', audience: 'followers' }, { onStage: stage => stages.push(stage), onProgress: value => progress.push(value) });
    expect(result.success).toBe(true);
    expect(mockUpload).toHaveBeenCalledWith(`${userId}/stories/${storyId}/media.jpg`, image.uri, 'image/jpeg', expect.any(Function));
    expect(mockRpc).toHaveBeenCalledWith('create_story', expect.objectContaining({ p_id: storyId, p_media_path: `${userId}/stories/${storyId}/media.jpg`, p_caption: 'hi', p_audience: 'followers', p_duration: null }));
    expect(stages).toEqual(['uploading', 'publishing']);
    expect(progress.at(-1)).toBe(1);
    expect(JSON.stringify(mockRpc.mock.calls)).not.toMatch(/object\/public/);
  });

  it('uploads a video thumbnail and sends the real duration', async () => {
    const result = await createStory(userId, storyId, video, { audience: 'close_friends' });
    expect(result.success).toBe(true);
    expect(mockUpload).toHaveBeenCalledWith(`${userId}/stories/${storyId}/thumbnail.jpg`, video.thumbnailUri, 'image/jpeg');
    expect(mockRpc).toHaveBeenCalledWith('create_story', expect.objectContaining({ p_media_type: 'video', p_duration: 8.5, p_thumbnail_path: `${userId}/stories/${storyId}/thumbnail.jpg`, p_audience: 'close_friends' }));
  });

  it('does not create a story when the upload fails', async () => {
    mockUpload.mockResolvedValueOnce({ success: false, retryable: true });
    const result = await createStory(userId, storyId, image, { audience: 'followers' });
    expect(result).toEqual({ success: false, error: 'uploadFailed', retryable: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('keeps uploads for a retry after a transient publication failure', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'ECONNRESET' } });
    const failed = await createStory(userId, storyId, image, { audience: 'followers' });
    expect(failed).toEqual({ success: false, error: 'publishFailed', retryable: true });
    expect(mockRemove).not.toHaveBeenCalled();
    mockUpload.mockResolvedValueOnce({ success: true, path: `${userId}/stories/${storyId}/media.jpg`, existed: true });
    const retried = await createStory(userId, storyId, image, { audience: 'followers' });
    expect(retried.success).toBe(true);
    expect(mockRpc.mock.calls.every(call => call[1].p_id === storyId)).toBe(true);
  });

  it('cleans up uploaded media when publication is rejected', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    const result = await createStory(userId, storyId, image, { audience: 'followers' });
    expect(result).toEqual({ success: false, error: 'publishFailed', retryable: false });
    expect(mockRemove).toHaveBeenCalledWith([`${userId}/stories/${storyId}/media.jpg`, `${userId}/stories/${storyId}/thumbnail.jpg`]);
  });

  it('rejects invalid drafts and audiences before uploading', async () => {
    await expect(createStory(userId, storyId, { ...image, mimeType: 'image/gif' }, { audience: 'followers' })).resolves.toMatchObject({ error: 'unsupportedMedia' });
    await expect(createStory(userId, storyId, image, { audience: 'everyone' as never })).resolves.toMatchObject({ error: 'invalidAudience' });
    await expect(createStory(userId, storyId, image, { caption: 'x'.repeat(501), audience: 'followers' })).resolves.toMatchObject({ error: 'captionTooLong' });
    expect(mockUpload).not.toHaveBeenCalled();
  });
});

describe('discardStoryUploads', () => {
  it('never deletes media that a published story references', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: storyId }, error: null });
    await expect(discardStoryUploads(userId, storyId, 'image/jpeg')).resolves.toBe(false);
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { code: 'network' } });
    await expect(discardStoryUploads(userId, storyId, 'image/jpeg')).resolves.toBe(false);
    expect(mockRemove).not.toHaveBeenCalled();
  });
});

describe('useStoryComposer', () => {
  function renderComposer() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return renderHook(() => useStoryComposer(userId), { wrapper });
  }

  it('prevents duplicate publishing from repeated taps', async () => {
    mockSelectStoryMedia.mockResolvedValue({ status: 'selected', asset: {} });
    mockPrepareStoryAsset.mockResolvedValue({ success: true, data: image });
    const { result } = renderComposer();
    await act(async () => { await result.current.choose('library'); });
    await act(async () => {
      await Promise.all([result.current.publish({ audience: 'followers' }), result.current.publish({ audience: 'followers' })]);
    });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(result.current.upload.status).toBe('success');
  });

  it('retries with the same story id after a failure', async () => {
    mockSelectStoryMedia.mockResolvedValue({ status: 'selected', asset: {} });
    mockPrepareStoryAsset.mockResolvedValue({ success: true, data: image });
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'ECONNRESET' } });
    const { result } = renderComposer();
    await act(async () => { await result.current.choose('camera'); });
    await act(async () => { await result.current.publish({ audience: 'followers' }); });
    expect(result.current.upload).toMatchObject({ status: 'failed', error: 'publishFailed' });
    await act(async () => { await result.current.publish({ audience: 'followers' }); });
    expect(result.current.upload.status).toBe('success');
    expect(mockRpc.mock.calls[0][1].p_id).toBe(mockRpc.mock.calls[1][1].p_id);
  });

  it('reports permission denial and invalid media', async () => {
    mockSelectStoryMedia.mockResolvedValueOnce({ status: 'denied', canAskAgain: false });
    const { result } = renderComposer();
    await act(async () => { await result.current.choose('camera'); });
    expect(result.current.upload.error).toBe('permissionDenied');
    mockSelectStoryMedia.mockResolvedValueOnce({ status: 'selected', asset: {} });
    mockPrepareStoryAsset.mockResolvedValueOnce({ success: false, error: 'videoTooLong' });
    await act(async () => { await result.current.choose('library'); });
    expect(result.current.upload.error).toBe('videoTooLong');
    expect(result.current.draft).toBeNull();
  });

  it('removes orphaned uploads when a failed draft is discarded', async () => {
    mockSelectStoryMedia.mockResolvedValue({ status: 'selected', asset: {} });
    mockPrepareStoryAsset.mockResolvedValue({ success: true, data: image });
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001' } });
    const { result } = renderComposer();
    await act(async () => { await result.current.choose('library'); });
    await act(async () => { await result.current.publish({ audience: 'followers' }); });
    expect(result.current.upload.error).toBe('rateLimited');
    await act(async () => { result.current.discard(); await Promise.resolve(); await Promise.resolve(); });
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(result.current.draft).toBeNull();
  });
});

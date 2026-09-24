import { useCallback, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';
import { prepareStoryAsset, selectStoryMedia, type StoryMediaSelection, type StoryMediaSource } from '@/services/storyMediaService';
import { createStory, discardStoryUploads, type StoryPublishOptions } from '@/services/storyService';
import { refreshStoryTray, storyKeys } from '@/hooks/useStories';
import type { Story, StoryDraft, StoryUploadState } from '@/types/domain';

const idle: StoryUploadState = { status: 'idle', progress: 0, error: null };

export const isPublishing = (state: StoryUploadState) => state.status === 'uploading' || state.status === 'publishing';

export function useStoryComposer(userId?: string) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [upload, setUpload] = useState<StoryUploadState>(idle);
  const storyId = useRef<string | null>(null);
  const uploadsMayExist = useRef(false);
  const busy = useRef(false);
  const lastProgress = useRef(0);

  const choose = useCallback(async (source: StoryMediaSource): Promise<StoryMediaSelection['status'] | 'busy' | 'invalid'> => {
    if (busy.current) return 'busy';
    busy.current = true;
    try {
      const selection = await selectStoryMedia(source);
      if (selection.status !== 'selected') {
        if (selection.status === 'denied') setUpload({ status: 'failed', progress: 0, error: 'permissionDenied' });
        return selection.status;
      }
      setUpload({ status: 'preparing', progress: 0, error: null });
      const prepared = await prepareStoryAsset(selection.asset);
      if (!prepared.success) {
        setUpload({ status: 'failed', progress: 0, error: prepared.error });
        return 'invalid';
      }
      storyId.current = randomUUID();
      uploadsMayExist.current = false;
      setDraft(prepared.data);
      setUpload(idle);
      return 'selected';
    } finally {
      busy.current = false;
    }
  }, []);

  const publish = useCallback(async (options: StoryPublishOptions): Promise<Story | null> => {
    if (busy.current || !userId || !draft || !storyId.current) return null;
    busy.current = true;
    lastProgress.current = 0;
    setUpload({ status: 'uploading', progress: 0, error: null });
    const result = await createStory(userId, storyId.current, draft, options, {
      onStage: stage => {
        if (stage === 'publishing') uploadsMayExist.current = true;
        setUpload(current => ({ ...current, status: stage }));
      },
      onProgress: fraction => {
        if (fraction < 1 && fraction - lastProgress.current < 0.02) return;
        lastProgress.current = fraction;
        uploadsMayExist.current = true;
        setUpload(current => ({ ...current, progress: fraction }));
      },
    });
    busy.current = false;
    if (!result.success) {
      if (!result.retryable) {
        storyId.current = randomUUID();
        uploadsMayExist.current = false;
      }
      setUpload(current => ({ status: 'failed', progress: current.progress, error: result.error }));
      return null;
    }
    uploadsMayExist.current = false;
    setUpload({ status: 'success', progress: 1, error: null });
    void refreshStoryTray(client);
    void client.invalidateQueries({ queryKey: storyKeys.author(userId), exact: true });
    return result.data;
  }, [client, draft, userId]);

  const discard = useCallback(() => {
    if (busy.current) return false;
    if (userId && draft && storyId.current && uploadsMayExist.current) void discardStoryUploads(userId, storyId.current, draft.mimeType);
    storyId.current = null;
    uploadsMayExist.current = false;
    setDraft(null);
    setUpload(idle);
    return true;
  }, [draft, userId]);

  const dismissError = useCallback(() => setUpload(current => current.status === 'failed' ? { ...idle, progress: 0 } : current), []);

  return { draft, upload, choose, publish, discard, dismissError };
}

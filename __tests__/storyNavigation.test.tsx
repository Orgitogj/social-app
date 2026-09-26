import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { useIncomingNavigation } from '@/hooks/useIncomingNavigation';
import { redirectSystemPath } from '@/app/+native-intent';
import { takePendingDestination } from '@/lib/deepLinking';
import ProfileStoryAvatar from '@/components/stories/ProfileStoryAvatar';
import { selectPlaybackUrl } from '@/components/stories/StoryPlayer';
import { storyKeys, useStoryMute } from '@/hooks/useStories';
import type { Story, StoryTrayItem } from '@/types/domain';

const mockPush = jest.fn();
const mockRpc = jest.fn();
const mockUrlListeners: ((event: { url: string }) => void)[] = [];
const mockLastResponse: { value: unknown } = { value: null };
const mockClearLast = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(async () => null),
  addEventListener: (_type: string, listener: (event: { url: string }) => void) => {
    mockUrlListeners.push(listener);
    return { remove: jest.fn() };
  },
}));
jest.mock('expo-notifications', () => ({
  getLastNotificationResponse: () => mockLastResponse.value,
  clearLastNotificationResponse: () => mockClearLast(),
  addNotificationResponseReceivedListener: () => ({ remove: jest.fn() }),
}));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({}), VideoView: () => null }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
jest.mock('@/services/imageService', () => ({ uploadFileWithProgress: jest.fn(), getUserImageSrc: () => null }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));

const storyId = 'c49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const authorId = 'a49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const otherId = 'b49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const storyHref = { pathname: '/main/storyViewer', params: { storyId } };

const activeStory = (viewed: boolean): Story => ({
  id: storyId, author_id: authorId, media_type: 'image', media_path: `${authorId}/stories/${storyId}/media.jpg`, mime_type: 'image/jpeg', width: 1, height: 1,
  audience: 'followers', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 3_600_000).toISOString(), viewed,
});

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUrlListeners.length = 0;
  mockLastResponse.value = null;
});

describe('story deep link routing', () => {
  it('opens a story link immediately when signed in', async () => {
    renderHook(() => useIncomingNavigation(true, true));
    await flush();
    await act(async () => { mockUrlListeners.forEach(listener => listener({ url: `supasocialapp://story/${storyId}` })); });
    expect(mockPush).toHaveBeenCalledWith(storyHref);
  });

  it('keeps a story link through sign-in and restores it afterwards', async () => {
    const hook = renderHook(({ authenticated }) => useIncomingNavigation(true, authenticated), { initialProps: { authenticated: false } });
    await flush();
    await act(async () => { mockUrlListeners.forEach(listener => listener({ url: `supasocialapp://story/${storyId}` })); });
    expect(mockPush).not.toHaveBeenCalled();
    hook.rerender({ authenticated: true });
    await flush();
    expect(mockPush).toHaveBeenCalledWith(storyHref);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('routes a story mention notification that launched the app', async () => {
    mockLastResponse.value = { notification: { request: { content: { data: { type: 'story_mention', storyId } } } } };
    renderHook(() => useIncomingNavigation(true, true));
    await flush();
    expect(mockPush).toHaveBeenCalledWith(storyHref);
    expect(mockClearLast).toHaveBeenCalled();
  });

  it('ignores malformed story links', async () => {
    renderHook(() => useIncomingNavigation(true, true));
    await flush();
    await act(async () => { mockUrlListeners.forEach(listener => listener({ url: 'supasocialapp://story/1%27%20or%201%3D1' })); });
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('profile story avatar', () => {
  function renderAvatar(own: boolean, stories: Story[] | undefined) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } });
    if (stories) client.setQueryData(storyKeys.author(authorId), stories);
    render(<QueryClientProvider client={client}><ProfileStoryAvatar userId={authorId} name="Ava" image={null} size={60} own={own} /></QueryClientProvider>);
    return client;
  }

  it('opens only the author sequence from another profile', () => {
    const client = renderAvatar(false, [activeStory(false)]);
    fireEvent.press(screen.getByLabelText('Ava has a new story, view story'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/main/storyViewer', params: { authorId, scope: 'author' } });
    client.clear();
  });

  it('shows a viewed ring label once every story is viewed', () => {
    const client = renderAvatar(false, [activeStory(true)]);
    expect(screen.getByLabelText('Ava has a story, view story')).toBeTruthy();
    client.clear();
  });

  it('shows no story affordance without accessible stories', () => {
    const client = renderAvatar(false, []);
    expect(screen.getByLabelText('Ava photo')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    client.clear();
  });

  it('hides expired stories from the ring', () => {
    const client = renderAvatar(false, [{ ...activeStory(false), expires_at: new Date(Date.now() - 1000).toISOString() }]);
    expect(screen.getByLabelText('Ava photo')).toBeTruthy();
    client.clear();
  });

  it('opens the composer from an own profile without stories', () => {
    const client = renderAvatar(true, []);
    fireEvent.press(screen.getByLabelText('Your photo, add to your story'));
    expect(mockPush).toHaveBeenCalledWith('/main/storyComposer');
    client.clear();
  });

  it('offers view and add actions on an own profile with stories', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const client = renderAvatar(true, [activeStory(true)]);
    fireEvent.press(screen.getByLabelText('Your photo, view or add to your story'));
    expect(alert.mock.calls[0][2]?.map(button => button.text)).toEqual(['View story', 'Add to story', 'Cancel']);
    alert.mockRestore();
    client.clear();
  });
});

describe('signed media reuse', () => {
  it('keeps the current playback url when a background refresh arrives', () => {
    expect(selectPlaybackUrl(null, 'https://signed/a', false)).toBe('https://signed/a');
    expect(selectPlaybackUrl('https://signed/a', 'https://signed/b', false)).toBe('https://signed/a');
    expect(selectPlaybackUrl('https://signed/a', 'https://signed/b', true)).toBe('https://signed/b');
    expect(selectPlaybackUrl('https://signed/a', null, true)).toBe('https://signed/a');
  });
});

describe('story mute cache', () => {
  it('reorders the tray optimistically and rolls back when saving fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const tray = (id: string, muted: boolean): StoryTrayItem => ({ author: { id, name: id }, story_count: 1, unviewed_count: 1, latest_story_at: id === authorId ? '2026-09-25T12:00:00Z' : '2026-09-25T11:00:00Z', has_close_friends: false, is_own: false, muted });
    client.setQueryData(storyKeys.tray(), [tray(authorId, false), tray(otherId, false)]);
    client.setQueryData(storyKeys.mute(authorId), false);
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'ECONNRESET' } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useStoryMute(authorId, false), { wrapper });
    let saved = true;
    await act(async () => { saved = await result.current.setMuted(true); });
    expect(saved).toBe(false);
    expect(client.getQueryData<boolean>(storyKeys.mute(authorId))).toBe(false);
    expect(client.getQueryData<StoryTrayItem[]>(storyKeys.tray())?.map(item => item.author.id)).toEqual([authorId, otherId]);
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    await act(async () => { saved = await result.current.setMuted(true); });
    expect(saved).toBe(true);
    expect(client.getQueryData<StoryTrayItem[]>(storyKeys.tray())?.map(item => item.author.id)).toEqual([otherId, authorId]);
    client.clear();
  });
});

describe('native intent redirect', () => {
  it('stores a cold-start story link as the pending destination', async () => {
    await expect(redirectSystemPath({ path: `supasocialapp://story/${storyId}` })).resolves.toBe('/');
    await expect(takePendingDestination()).resolves.toEqual({ kind: 'story', storyId });
    await expect(redirectSystemPath({ path: 'supasocialapp://story/not-a-uuid' })).resolves.toBe('supasocialapp://story/not-a-uuid');
    await expect(takePendingDestination()).resolves.toBeNull();
  });
});

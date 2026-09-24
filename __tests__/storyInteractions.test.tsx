import React from 'react';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { extractMentions, splitMentions } from '@/helpers/common';
import { messagePreviewText, storyMessageLabel } from '@/helpers/chat';
import { storyInteractionSchema } from '@/helpers/validation';
import { parseMessage, parseStoryContext, type MessagePage } from '@/services/chatService';
import { fetchStoryViewers, parseStoryViewerEntry, sendStoryInteraction } from '@/services/storyService';
import { chatKeys } from '@/hooks/useChat';
import { REACTION_COOLDOWN_MS, reactionAllowed, useStoryInteraction } from '@/hooks/useStoryInteraction';
import { interactionStatusLabel } from '@/components/stories/StoryInteractionStatus';
import { viewCountLabel } from '@/components/stories/StoryViewCount';
import { storyPreviewDescription } from '@/components/chat/StoryMessageCard';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
jest.mock('@/services/imageService', () => ({ uploadFileWithProgress: jest.fn(), uploadFile: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({}));
jest.mock('expo-crypto', () => {
  let counter = 0;
  return { randomUUID: () => `e49d3be3-82e9-4a96-ae64-a868d7ddc2${String(++counter).padStart(2, '0')}` };
});

const storyId = 'c49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const conversationId = 'b49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const authorId = 'a49d3be3-82e9-4a96-ae64-a868d7ddc2a4';

const storyContext = { story_id: storyId, author_id: authorId, media_type: 'image', created_at: '2026-09-25T08:00:00Z' };
const messageDocument = (args: { p_client_id: string; p_kind: string; p_text: string }, available = true) => ({
  id: `m-${args.p_client_id}`, client_id: args.p_client_id, conversation_id: conversationId, userId: 'me', text: args.p_text,
  message_type: args.p_kind === 'reply' ? 'story_reply' : 'story_reaction', created_at: '2026-09-25T09:00:00Z', status: 'sent', reactions: [],
  story: { ...storyContext, available, preview_path: available ? `${authorId}/stories/${storyId}/media.jpg` : null, expires_at: available ? '2026-09-26T08:00:00Z' : null },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRpc.mockImplementation(async (_name: string, args: { p_client_id: string; p_kind: string; p_text: string }) => ({ data: messageDocument(args), error: null }));
});

describe('story message context', () => {
  it('parses available and historical story context safely', () => {
    expect(parseStoryContext({ ...storyContext, available: true, preview_path: 'p.jpg', expires_at: '2026-09-26T08:00:00Z' })).toMatchObject({ available: true, preview_path: 'p.jpg' });
    expect(parseStoryContext({ ...storyContext, available: false, preview_path: 'leaked.jpg', expires_at: 'x' })).toMatchObject({ available: false, preview_path: null, expires_at: null });
    expect(parseStoryContext({ ...storyContext, media_type: 'gif' })).toBeNull();
    expect(parseStoryContext(null)).toBeNull();
    const message = parseMessage(messageDocument({ p_client_id: 'c1', p_kind: 'reply', p_text: 'Nice' }, false));
    expect(message).toMatchObject({ message_type: 'story_reply', story: { story_id: storyId, available: false } });
  });

  it('labels replies and reactions for both participants', () => {
    expect(storyMessageLabel('story_reply', 'Nice', false)).toBe('Replied to your story');
    expect(storyMessageLabel('story_reply', 'Nice', true)).toBe('You replied to their story');
    expect(storyMessageLabel('story_reaction', '🔥', false)).toBe('Reacted 🔥 to your story');
    expect(messagePreviewText({ text: '🔥', message_type: 'story_reaction' }, true)).toBe('You reacted 🔥 to their story');
    expect(messagePreviewText({ text: 'Nice', message_type: 'story_reply' })).toBe('Story reply: Nice');
    expect(messagePreviewText({ text: '', message_type: 'story_reply', deleted_at: '2026-09-25T10:00:00Z' }, false)).toBe('This message was deleted');
    expect(messagePreviewText({ text: '', message_type: 'image' })).toBe('Photo');
    expect(storyPreviewDescription({ ...storyContext, media_type: 'video', available: false, preview_path: null, expires_at: null })).toBe('Video story · no longer available');
  });
});

describe('story interaction validation', () => {
  it('validates replies and supported reactions', () => {
    expect(storyInteractionSchema.safeParse({ kind: 'reply', storyId, clientId: storyId, text: 'Hello' }).success).toBe(true);
    expect(storyInteractionSchema.safeParse({ kind: 'reply', storyId, clientId: storyId, text: '   ' }).success).toBe(false);
    expect(storyInteractionSchema.safeParse({ kind: 'reaction', storyId, clientId: storyId, text: '❤️' }).success).toBe(true);
    expect(storyInteractionSchema.safeParse({ kind: 'reaction', storyId, clientId: storyId, text: '💩' }).success).toBe(false);
    expect(storyInteractionSchema.safeParse({ kind: 'poke', storyId, clientId: storyId, text: 'x' }).success).toBe(false);
  });

  it('sends through the shared story interaction rpc', async () => {
    const result = await sendStoryInteraction({ kind: 'reply', storyId, clientId: storyId, text: 'Looks great' });
    expect(result).toMatchObject({ success: true, data: { message_type: 'story_reply', story: { story_id: storyId } } });
    expect(mockRpc).toHaveBeenCalledWith('send_story_interaction', { p_story_id: storyId, p_client_id: storyId, p_kind: 'reply', p_text: 'Looks great' });
    await expect(sendStoryInteraction({ kind: 'reaction', storyId, clientId: storyId, text: 'nope' })).resolves.toMatchObject({ success: false, error: { code: 'invalidData' } });
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});

describe('useStoryInteraction', () => {
  function renderInteraction() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId), { pages: [{ items: [], nextCursor: null }], pageParams: [null] });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { client, ...renderHook(() => useStoryInteraction(storyId), { wrapper }) };
  }

  it('ignores rapid repeated reactions but allows a different one', async () => {
    const { result, client } = renderInteraction();
    await act(async () => { await result.current.react('❤️'); });
    await act(async () => { await result.current.react('❤️'); });
    await act(async () => { await result.current.react('🔥'); });
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(result.current.state).toMatchObject({ status: 'sent', kind: 'reaction', reaction: '🔥' });
    expect(client.getQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId))?.pages[0].items).toHaveLength(2);
    client.clear();
  });

  it('retries a failed reply with the same client id', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'ECONNRESET' } });
    const { result, client } = renderInteraction();
    await act(async () => { await result.current.reply('Hi there'); });
    expect(result.current.state).toMatchObject({ status: 'failed', error: 'failed' });
    expect(result.current.canRetry).toBe(true);
    await act(async () => { await result.current.retry(); });
    expect(result.current.state.status).toBe('sent');
    expect(mockRpc.mock.calls[0][1].p_client_id).toBe(mockRpc.mock.calls[1][1].p_client_id);
    client.clear();
  });

  it('does not offer a retry when messaging is not allowed', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    const { result, client } = renderInteraction();
    await act(async () => { await result.current.react('👍'); });
    expect(result.current.state).toMatchObject({ status: 'failed', error: 'notAllowed' });
    expect(result.current.canRetry).toBe(false);
    expect(interactionStatusLabel(result.current.state)).toBe('You can’t reply to this story.');
    client.clear();
  });

  it('applies a reaction cooldown per emoji', () => {
    expect(reactionAllowed(null, '❤️', 0)).toBe(true);
    expect(reactionAllowed({ emoji: '❤️', at: 0 }, '❤️', REACTION_COOLDOWN_MS - 1)).toBe(false);
    expect(reactionAllowed({ emoji: '❤️', at: 0 }, '❤️', REACTION_COOLDOWN_MS)).toBe(true);
    expect(reactionAllowed({ emoji: '❤️', at: 0 }, '😂', 1)).toBe(true);
  });
});

describe('story viewers', () => {
  it('parses viewer rows and pages by cursor', async () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ viewer: { id: `v${index}`, name: `V${index}`, username: null, image: null }, viewed_at: `2026-09-25T09:${String(59 - index).padStart(2, '0')}:00Z` }));
    mockRpc.mockResolvedValueOnce({ data: rows, error: null });
    const page = await fetchStoryViewers(storyId);
    expect(page).toMatchObject({ success: true, data: { nextCursor: { viewed_at: '2026-09-25T09:30:00Z', id: 'v29' } } });
    expect(mockRpc).toHaveBeenCalledWith('get_story_viewers', { p_story_id: storyId, p_before_time: undefined, p_before_id: undefined, p_limit: 30 });
    mockRpc.mockResolvedValueOnce({ data: rows.slice(0, 2), error: null });
    await expect(fetchStoryViewers(storyId, { viewed_at: '2026-09-25T09:30:00Z', id: 'v29' })).resolves.toMatchObject({ success: true, data: { nextCursor: null } });
    expect(parseStoryViewerEntry({ viewer: { id: 'x' }, viewed_at: 'now' })).toBeNull();
    expect(viewCountLabel(1)).toBe('1 viewer');
    expect(viewCountLabel(null)).toBe('0 viewers');
  });
});

describe('caption mentions', () => {
  it('splits captions into text and mention segments with the shared pattern', () => {
    expect(splitMentions('Hi @Bob and @al, see @valid_name!')).toEqual([
      { text: 'Hi ', mention: null },
      { text: '@Bob', mention: 'bob' },
      { text: ' and @al, see ', mention: null },
      { text: '@valid_name', mention: 'valid_name' },
      { text: '!', mention: null },
    ]);
    expect(splitMentions('mail@example.com')).toEqual([{ text: 'mail@example.com', mention: null }]);
    expect(extractMentions('@bob @Bob @bob')).toEqual(['bob']);
  });
});

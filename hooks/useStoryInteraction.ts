import { useCallback, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { chatKeys, upsertMessage } from '@/hooks/useChat';
import { sendStoryInteraction, type StoryInteractionInput } from '@/services/storyService';
import type { MessagePage } from '@/services/chatService';
import type { StoryInteractionKind } from '@/types/domain';

export const REACTION_COOLDOWN_MS = 1500;

export type StoryInteractionState = { status: 'idle' | 'sending' | 'sent' | 'failed'; kind: StoryInteractionKind | null; reaction: string | null; error: 'notAllowed' | 'rateLimited' | 'failed' | null; retryable: boolean };

const idle: StoryInteractionState = { status: 'idle', kind: null, reaction: null, error: null, retryable: false };

export function reactionAllowed(lastReaction: { emoji: string; at: number } | null, emoji: string, now = Date.now()) {
  return !lastReaction || lastReaction.emoji !== emoji || now - lastReaction.at >= REACTION_COOLDOWN_MS;
}

export function useStoryInteraction(storyId: string | undefined) {
  const client = useQueryClient();
  const [state, setState] = useState<StoryInteractionState>(idle);
  const inFlight = useRef(false);
  const failed = useRef<StoryInteractionInput | null>(null);
  const lastReaction = useRef<{ emoji: string; at: number } | null>(null);

  const submit = useCallback(async (input: StoryInteractionInput) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setState({ status: 'sending', kind: input.kind, reaction: input.kind === 'reaction' ? input.text : null, error: null, retryable: false });
    const result = await sendStoryInteraction(input);
    inFlight.current = false;
    if (!result.success) {
      failed.current = result.error.retryable ? input : null;
      setState({ status: 'failed', kind: input.kind, reaction: input.kind === 'reaction' ? input.text : null, error: result.error.code === 'notAllowed' ? 'notAllowed' : result.error.code === 'rateLimited' ? 'rateLimited' : 'failed', retryable: result.error.retryable });
      return false;
    }
    failed.current = null;
    client.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(result.data.conversation_id), current => upsertMessage(current, result.data));
    setState({ status: 'sent', kind: input.kind, reaction: input.kind === 'reaction' ? input.text : null, error: null, retryable: false });
    return true;
  }, [client]);

  const reply = useCallback((text: string) => {
    if (!storyId || !text.trim()) return Promise.resolve(false);
    return submit({ kind: 'reply', storyId, clientId: randomUUID(), text });
  }, [storyId, submit]);

  const react = useCallback((emoji: string) => {
    if (!storyId || !reactionAllowed(lastReaction.current, emoji)) return Promise.resolve(false);
    lastReaction.current = { emoji, at: Date.now() };
    return submit({ kind: 'reaction', storyId, clientId: randomUUID(), text: emoji });
  }, [storyId, submit]);

  const retry = useCallback(() => failed.current ? submit(failed.current) : Promise.resolve(false), [submit]);
  const reset = useCallback(() => setState(idle), []);

  return { state, reply, react, retry, reset, canRetry: state.status === 'failed' && state.retryable };
}

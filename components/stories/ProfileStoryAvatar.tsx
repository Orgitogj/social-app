import React, { memo, useCallback, useMemo } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import StoryAvatar from '@/components/stories/StoryAvatar';
import { isStoryExpired, storyListRingState } from '@/helpers/stories';
import { useAuthorStories, useExpiryClock } from '@/hooks/useStories';
import type { StoryRingState } from '@/types/domain';

type ProfileStoryAvatarProps = { userId?: string | null; name?: string | null; image?: string | null; size: number; rounded?: number; own: boolean };

export function profileStoryAction(own: boolean, state: StoryRingState): 'choose' | 'create' | 'view' | 'none' {
  if (own) return state === 'none' ? 'create' : 'choose';
  return state === 'none' ? 'none' : 'view';
}

function ProfileStoryAvatar({ userId, name, image, size, rounded, own }: ProfileStoryAvatarProps) {
  const router = useRouter();
  const stories = useAuthorStories(userId ?? undefined);
  const now = useExpiryClock(stories.data);
  const state = storyListRingState(stories.data, own, now);
  const closeFriends = useMemo(() => (stories.data ?? []).some(story => story.audience === 'close_friends' && !isStoryExpired(story, now)), [now, stories.data]);
  const action = profileStoryAction(own, state);

  const openViewer = useCallback(() => {
    if (userId) router.push({ pathname: '/main/storyViewer', params: { authorId: userId, scope: 'author' } });
  }, [router, userId]);
  const openComposer = useCallback(() => router.push('/main/storyComposer'), [router]);

  const onPress = useCallback(() => {
    if (action === 'view') openViewer();
    else if (action === 'create') openComposer();
    else if (action === 'choose') {
      Alert.alert('Your story', undefined, [
        { text: 'View story', onPress: openViewer },
        { text: 'Add to story', onPress: openComposer },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [action, openComposer, openViewer]);

  const label = action === 'none'
    ? `${name ?? 'Profile'} photo`
    : own
      ? action === 'create' ? 'Your photo, add to your story' : 'Your photo, view or add to your story'
      : `${name ?? 'This account'} has ${state === 'unviewed' ? 'a new story' : 'a story'}, view story`;

  const avatar = <StoryAvatar uri={image} size={size} rounded={rounded} state={state} closeFriends={closeFriends} onAddPress={own ? openComposer : undefined} />;
  if (action === 'none') return <View accessible accessibilityRole="image" accessibilityLabel={label}>{avatar}</View>;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>{avatar}</Pressable>;
}

export default memo(ProfileStoryAvatar);

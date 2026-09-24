import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native';
import { useRouter } from 'expo-router';
import StoryAvatar from '@/components/stories/StoryAvatar';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContexts';
import { storyRingState } from '@/helpers/stories';
import { useStoryTray } from '@/hooks/useStories';
import type { Profile, StoryTrayItem } from '@/types/domain';

const ITEM_WIDTH = 80;
const AVATAR_SIZE = 60;

type BarEntry = { kind: 'own'; profile: Profile; item: StoryTrayItem | null } | { kind: 'author'; item: StoryTrayItem };

type StoryBarItemProps = {
  profile: Profile;
  item: StoryTrayItem | null;
  own: boolean;
  onOpen: (authorId: string, hasStories: boolean) => void;
  onAdd?: () => void;
};

const StoryBarItem = memo(function StoryBarItem({ profile, item, own, onOpen, onAdd }: StoryBarItemProps) {
  const state = storyRingState(item);
  const label = own ? 'Your story' : profile.username || profile.name;
  const unviewed = !own && (item?.unviewed_count ?? 0) > 0;
  const description = own
    ? item ? 'Your story, view your active stories' : 'Your story, add a story'
    : `${profile.name}, ${unviewed ? 'new story' : 'story viewed'}${item?.has_close_friends ? ', close friends' : ''}`;
  return (
    <View style={styles.item}>
      <Pressable
        onPress={() => onOpen(profile.id, Boolean(item))}
        accessibilityRole="button"
        accessibilityLabel={description}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <StoryAvatar uri={profile.image} size={AVATAR_SIZE} state={state} closeFriends={item?.has_close_friends} onAddPress={own ? onAdd : undefined} />
        <Text style={[styles.label, unviewed && styles.labelUnviewed]} numberOfLines={1}>{label}</Text>
      </Pressable>
    </View>
  );
});

function StoriesBar() {
  const { user } = useAuth();
  const router = useRouter();
  const tray = useStoryTray(user?.id);

  const entries = useMemo<BarEntry[]>(() => {
    if (!user?.id) return [];
    const items = tray.data ?? [];
    const own = items.find(item => item.is_own) ?? null;
    const profile: Profile = own?.author ?? { id: user.id, name: user.name ?? '', username: user.username ?? null, image: user.image ?? null };
    return [{ kind: 'own', profile, item: own }, ...items.filter(item => !item.is_own).map(item => ({ kind: 'author' as const, item }))];
  }, [tray.data, user?.id, user?.image, user?.name, user?.username]);

  const openComposer = useCallback(() => router.push('/main/storyComposer'), [router]);
  const open = useCallback((authorId: string, hasStories: boolean) => {
    if (!hasStories) openComposer();
    else router.push({ pathname: '/main/storyViewer', params: { authorId } });
  }, [openComposer, router]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<BarEntry>) => item.kind === 'own'
    ? <StoryBarItem profile={item.profile} item={item.item} own onOpen={open} onAdd={openComposer} />
    : <StoryBarItem profile={item.item.author} item={item.item} own={false} onOpen={open} />, [open, openComposer]);

  if (!entries.length) return null;
  return (
    <FlatList
      horizontal
      data={entries}
      renderItem={renderItem}
      keyExtractor={entry => entry.kind === 'own' ? 'own' : entry.item.author.id}
      getItemLayout={(_, index) => ({ length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index })}
      showsHorizontalScrollIndicator={false}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={5}
      contentContainerStyle={styles.content}
      style={styles.list}
      accessibilityLabel="Stories"
    />
  );
}

export default memo(StoriesBar);

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.gray,
  },
  content: {
    paddingVertical: 10,
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
  },
  pressable: {
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    maxWidth: ITEM_WIDTH - 8,
    fontSize: 12,
    color: theme.colors.textLight,
  },
  labelUnviewed: {
    color: theme.colors.textDark,
    fontWeight: theme.fonts.semibold,
  },
});

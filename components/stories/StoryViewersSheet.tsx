import React, { memo, useMemo } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import { viewCountLabel } from '@/components/stories/StoryViewCount';
import { theme } from '@/constants/theme';
import { relativeTime } from '@/helpers/common';
import { useStoryViewers } from '@/hooks/useStories';
import type { StoryViewerEntry } from '@/types/domain';

type StoryViewersSheetProps = { storyId: string; count: number | null | undefined; visible: boolean; onClose: () => void };

const ViewerRow = memo(function ViewerRow({ entry }: { entry: StoryViewerEntry }) {
  const time = relativeTime(entry.viewed_at);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${entry.viewer.name}${entry.viewer.username ? `, @${entry.viewer.username}` : ''}, viewed ${time}`}>
      <Avatar uri={entry.viewer.image ?? undefined} size={44} rounded={14} />
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>{entry.viewer.name}</Text>
        {entry.viewer.username ? <Text style={styles.username} numberOfLines={1}>@{entry.viewer.username}</Text> : null}
      </View>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
});

function StoryViewersSheet({ storyId, count, visible, onClose }: StoryViewersSheetProps) {
  const insets = useSafeAreaInsets();
  const viewers = useStoryViewers(storyId, visible);
  const items = useMemo(() => viewers.data?.pages.flatMap(page => page.items) ?? [], [viewers.data]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close viewers" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">{viewCountLabel(count ?? items.length)}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close viewers" hitSlop={8} style={styles.close}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>
        {viewers.isPending ? <ActivityIndicator style={styles.state} color={theme.colors.primary} accessibilityLabel="Loading viewers" /> : null}
        {viewers.isError && !items.length ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>Viewers could not be loaded.</Text>
            <Pressable onPress={() => { void viewers.refetch(); }} accessibilityRole="button" style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : null}
        {viewers.isSuccess && !items.length ? <Text style={[styles.state, styles.stateText]}>No one has viewed this story yet.</Text> : null}
        <FlatList
          data={items}
          keyExtractor={item => item.viewer.id}
          renderItem={({ item }) => <ViewerRow entry={item} />}
          onEndReached={() => { if (viewers.hasNextPage && !viewers.isFetchingNextPage) void viewers.fetchNextPage(); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={viewers.isFetchingNextPage ? <ActivityIndicator color={theme.colors.primary} /> : null}
          style={styles.list}
        />
      </View>
    </Modal>
  );
}

export default memo(StoryViewersSheet);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    maxHeight: '70%',
    minHeight: 240,
    backgroundColor: 'white',
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.gray,
  },
  title: {
    fontSize: 17,
    fontWeight: theme.fonts.bold,
    color: theme.colors.textDark,
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
  },
  closeText: {
    color: theme.colors.primaryDark,
    fontSize: 15,
    fontWeight: theme.fonts.semibold,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: theme.fonts.semibold,
    color: theme.colors.textDark,
  },
  username: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  time: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  state: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  stateText: {
    textAlign: 'center',
    color: theme.colors.textLight,
    fontSize: 14,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  retryText: {
    color: theme.colors.primaryDark,
    fontWeight: theme.fonts.semibold,
  },
});

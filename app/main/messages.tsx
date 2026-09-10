import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/screenWrapper';
import BackButton from '@/components/BackButton';
import Loading from '@/components/Loading';
import { ConversationRow } from '@/components/chat/ConversationRow';
import { useAuth } from '@/contexts/AuthContexts';
import { useConversations } from '@/hooks/useChat';
import type { Conversation } from '@/types/domain';
import { theme } from '@/constants/theme';

export default function Messages() {
  const router = useRouter();
  const { user } = useAuth();
  const inbox = useConversations(user?.id);
  const render = useCallback(({ item }: { item: Conversation }) => <ConversationRow conversation={item} onPress={() => router.push({ pathname: '/main/chat', params: { conversationId: item.id } })} />, [router]);
  return <ScreenWrapper bg="white"><View style={styles.container}>
    <View style={styles.header}><BackButton /><Text style={styles.title}>Messages</Text></View>
    <FlatList data={inbox.conversations} keyExtractor={item => item.id} renderItem={render} contentContainerStyle={styles.list} onEndReached={() => { if (inbox.hasNextPage && !inbox.isFetchingNextPage) void inbox.fetchNextPage(); }} onEndReachedThreshold={0.25} ListEmptyComponent={inbox.isLoading ? <View style={styles.loading}><Loading /></View> : <Text style={styles.empty}>No conversations yet.</Text>} ListFooterComponent={inbox.isFetchingNextPage ? <Loading size="small" /> : null} />
    <Pressable style={styles.search} onPress={() => router.push('/main/search')}><Text style={styles.searchText}>Find people to message</Text></Pressable>
  </View></ScreenWrapper>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 5 },
  title: { fontSize: 25, color: theme.colors.textDark, fontWeight: theme.fonts.bold as '700' },
  list: { flexGrow: 1, paddingBottom: 80 },
  loading: { paddingTop: 80 },
  empty: { color: theme.colors.textLight, textAlign: 'center', paddingTop: 60 },
  search: { position: 'absolute', right: 18, bottom: 18, paddingHorizontal: 16, paddingVertical: 12, borderRadius: theme.radius.xl, backgroundColor: theme.colors.primaryDark },
  searchText: { color: 'white', fontWeight: theme.fonts.semibold as '600' },
});

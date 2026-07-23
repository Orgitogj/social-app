import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import ScreenWrapper from '../../components/screenWrapper'
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContexts';
import { theme } from '@/constants/theme';
import { hp, wp } from '@/helpers/common';
import Icon from '@/assets/icons';
import { useRouter } from 'expo-router';
import Avatar from '@/components/Avatar';
import { fetchPosts } from '@/services/postService';
import PostCard from '../../components/PostCard'
import Loading from '@/components/Loading';
import { getUserData } from '@/services/userService';

const Home = () => {
  const { user, setAuth } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const limitRef = useRef(0);
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const postsRef = useRef<any[]>([]);

  const handlePostEvent = async (payload: any) => {
    if (payload.eventType == 'INSERT' && payload?.new?.id) {
      let newPost = { ...payload.new };
      let res = await getUserData(newPost.userId);
      newPost.user = res.success ? res.data : {};
      setPosts(prevPosts => {
        const updated = [newPost, ...prevPosts];
        postsRef.current = updated;
        return updated;
      });
    }
  }

  const getPosts = async () => {
    if (!hasMoreRef.current || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);

    const startTime = Date.now();
    const minDuration = 600;          

    limitRef.current = limitRef.current + 4;
    let res = await fetchPosts(limitRef.current);

    const elapsed = Date.now() - startTime;
    const remaining = minDuration - elapsed;

    const finish = () => {
      if (res.success && res.data) {
        if (postsRef.current.length === res.data.length) {
          hasMoreRef.current = false;
          setHasMore(false);
        }
        postsRef.current = res.data;
        setPosts(res.data);
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
      setLoading(false);
      isFetchingRef.current = false;
    };

    if (remaining > 0) {
      setTimeout(finish, remaining);
    } else {
      finish();
    }
  }

  useEffect(() => {
    let postChannel = supabase
      .channel(`posts-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, handlePostEvent)
      .subscribe();

    getPosts();

    return () => {
      supabase.removeChannel(postChannel);
    }
  }, [])

  return (
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>LinkUp</Text>
          <View style={styles.icons}>
            <Pressable onPress={() => router.push('/main/notifications')}>
              <Icon name="heart" size={hp(3.2)} strokeWidth={2} color={theme.colors.text} />
            </Pressable>
            <Pressable onPress={() => router.push('/main/newPost')}>
              <Icon name="plus" size={hp(3.2)} strokeWidth={2} color={theme.colors.text} />
            </Pressable>
            <Pressable onPress={() => router.push('/main/profile')}>
              <Avatar
                uri={user?.image}
                size={hp(5)}
                rounded={theme.radius.sm}
                style={{ borderWidth: 2 }}
              />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={posts}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listStyle}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <PostCard
              item={item}
              currentUser={user}
              router={router}
            />
          )}
          onEndReached={() => {
            getPosts();
          }}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            hasMore ? (
              <View style={{ marginVertical: posts.length === 0 ? 200 : 30 }}>
                <Loading />
              </View>
            ) : (
              <View style={{ marginVertical: 30 }}>
                <Text style={styles.noPosts}>No more posts</Text>
              </View>
            )
          }
        />
      </View>
    </ScreenWrapper>
  )
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginHorizontal: wp(4),
  },

  title: {
    color: theme.colors.text,
    fontSize: hp(3.2),
    fontWeight: theme.fonts.bold as any,
  },

  avatarImage: {
    height: hp(4.3),
    width: hp(4.3),
    borderRadius: theme.radius.sm,
    borderCurve: 'continuous',
    borderColor: theme.colors.gray,
    borderWidth: 3,
  },

  icons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18
  },

  listStyle: {
    paddingTop: 20,
    paddingHorizontal: wp(4),
  },

  noPosts: {
    fontSize: hp(2),
    textAlign: 'center',
    color: theme.colors.text,
  },

  pill: {
    position: 'absolute',
    right: -10,
    top: -4,
    height: hp(2.2),
    width: hp(2.2),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.roseLight,
  },

  pillText: {
    color: 'white',
    fontSize: hp(1.2),
    fontWeight: theme.fonts.bold as any,
  },
});
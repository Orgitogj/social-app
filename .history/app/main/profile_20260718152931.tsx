import { View, Text, TouchableOpacity, StyleSheet, Alert, Pressable, FlatList } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import { useAuth } from '@/contexts/AuthContexts'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Header from '@/components/Header'
import { wp, hp } from '@/helpers/common'
import { theme } from '@/constants/theme'
import Icon from '../../assets/icons'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import { fetchPosts } from '@/services/postService'
import { getUserData } from '@/services/userService'
import PostCard from '@/components/PostCard'
import Loading from '@/components/Loading'

const Profile = () => {
  const { user: currentUser, setAuth } = useAuth()
  const router = useRouter()
  const { userId } = useLocalSearchParams<{ userId?: string }>()

  const isOwnProfile = !userId || userId === currentUser?.id
  const profileUserId = isOwnProfile ? currentUser?.id : userId


  const [posts, setPosts] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const limitRef = useRef(0);
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const postsRef = useRef<any[]>([]);

  const loadProfileUser = async () => {
    if (isOwnProfile) return; // currentUser vjen direkt nga AuthContext, i freskët
    if (!profileUserId) return;
    let res = await getUserData(profileUserId);
    if (res.success) setProfileUser(res.data);
  }
  const PAGE_SIZE = 4;

const getPosts = async () => {
  if (!hasMoreRef.current || isFetchingRef.current || !profileUserId) return;

  isFetchingRef.current = true;
  setLoading(true);

  const offset = postsRef.current.length;
  let res = await fetchPosts(PAGE_SIZE, profileUserId, offset);

  if (res.success && res.data) {
    if (res.data.length < PAGE_SIZE) {
      hasMoreRef.current = false;
      setHasMore(false);
    }
    const updated = [...postsRef.current, ...res.data];
    postsRef.current = updated;
    setPosts(updated);
  } else {
    hasMoreRef.current = false;
    setHasMore(false);
  }

  setLoading(false);
  isFetchingRef.current = false;
}

  useEffect(() => {
    limitRef.current = 0;
    hasMoreRef.current = true;
    postsRef.current = [];
    setPosts([]);
    setHasMore(true);

    loadProfileUser();
    getPosts();
  }, [profileUserId])

  // Realtime: posts (insert/update/delete) dhe postLikes, vetem per postimet e ketij profili
  useEffect(() => {
    if (!profileUserId) return;

    const handlePostEvent = (payload: any) => {
      if (payload.eventType === 'DELETE' && payload?.old?.id) {
        const deletedId = payload.old.id;
        setPosts(prevPosts => {
          const updated = prevPosts.filter(post => post.id !== deletedId);
          postsRef.current = updated;
          return updated;
        });
      }

      if (payload.eventType === 'UPDATE' && payload?.new?.id) {
        const updatedPost = payload.new;
        if (updatedPost.userId !== profileUserId) return;
        setPosts(prevPosts => {
          const updated = prevPosts.map(post => {
            if (post.id !== updatedPost.id) return post;
            return { ...post, body: updatedPost.body, file: updatedPost.file };
          });
          postsRef.current = updated;
          return updated;
        });
      }
    }

    const handleLikeEvent = (payload: any) => {
      if (payload.eventType === 'INSERT' && payload?.new?.postId) {
        const postId = payload.new.postId;
        setPosts(prevPosts => {
          const updated = prevPosts.map(post => {
            if (post.id !== postId) return post;
            const currentLikes = post?.postLikes || [];
            if (currentLikes.some((l: any) => l.id === payload.new.id)) return post;
            return { ...post, postLikes: [...currentLikes, payload.new] };
          });
          postsRef.current = updated;
          return updated;
        });
      }

      if (payload.eventType === 'DELETE' && payload?.old?.id) {
        setPosts(prevPosts => {
          const updated = prevPosts.map(post => {
            const currentLikes = post?.postLikes || [];
            if (!currentLikes.some((l: any) => l.id === payload.old.id)) return post;
            return { ...post, postLikes: currentLikes.filter((l: any) => l.id !== payload.old.id) };
          });
          postsRef.current = updated;
          return updated;
        });
      }
    }

    let postChannel = supabase
      .channel(`posts-profile-${profileUserId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: `userId=eq.${profileUserId}`
      }, handlePostEvent)
      .subscribe();

    let likeChannel = supabase
      .channel(`postlikes-profile-${profileUserId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'postLikes' }, handleLikeEvent)
      .subscribe();

    return () => {
      supabase.removeChannel(postChannel);
      supabase.removeChannel(likeChannel);
    }
  }, [profileUserId])

  const onLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      Alert.alert('Signout', 'Error signing out')
    }
  }

  const handleLogout = async () => {
    Alert.alert('Confirm', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => console.log('Modal cancelled'),
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: () => onLogout(),
        style: 'destructive',
      },
    ])
  }

  return (
    <ScreenWrapper bg="white">
      <FlatList
        data={posts}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listStyle}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={
          <UserHeader
            user={displayUser}
            router={router}
            handleLogout={handleLogout}
            isOwnProfile={isOwnProfile}
          />
        }
        ListHeaderComponentStyle={{ marginBottom: 30 }}
        renderItem={({ item }) => (
            <PostCard
              item={
                isOwnProfile
                  ? { ...item, user: { ...item.user, name: currentUser?.name, image: currentUser?.image } }
                  : item
              }
              currentUser={currentUser}
              router={router}
            />
          )}
        onEndReached={() => {
          getPosts();
        }}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          hasMore ? (
            <View style={{ marginVertical: posts.length === 0 ? 100 : 30 }}>
              <Loading />
            </View>
          ) : (
            <View style={{ marginVertical: 30 }}>
              <Text style={styles.noPosts}>No more posts</Text>
            </View>
          )
        }
      />
    </ScreenWrapper>
  )
}

type UserHeaderProps = {
  user: any;
  router: any;
  handleLogout: () => void;
  isOwnProfile: boolean;
};
const UserHeader = ({ user, router, handleLogout, isOwnProfile }: UserHeaderProps) => {
  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: wp(4) }}>
      <View>
        <Header title={isOwnProfile ? 'Profile' : user?.name} mb={30} />

        {isOwnProfile && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Icon
              name="logout"
              color={theme.colors.rose}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.container}>
        <View style={{ gap: 20 }}>
          <View style={styles.avatarContainer}>
            <Avatar
              uri={user?.image}
              size={hp(12)}
              rounded={theme.radius.xxl * 1.4}
            />

            {isOwnProfile && (
              <Pressable
                style={styles.editIcon}
                onPress={() => router.push('/main/editProfile')}
              >
                <Icon
                  name="edit"
                  strokeWidth={2.5}
                  size={20}
                />
              </Pressable>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.infoText}>New York</Text>
          </View>

          <View style={styles.info}>
            <Icon
              name="mail"
              size={20}
              color={theme.colors.textLight}
            />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          {
            user && user.phoneNumber && (
              <View style={styles.info}>
                <Icon
                  name="call"
                  size={20}
                  color={theme.colors.textLight}
                />
                <Text style={styles.infoText}>{user?.phoneNumber}</Text>
              </View>
            )
          }
          {
            user && user.bio && (
              <Text style={styles.infoText}>{user.bio}</Text>
            )
          }
        </View>
      </View>
    </View>
  )
}

export default Profile

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerContainer: {
    marginHorizontal: wp(4),
    marginBottom: 20,
  },

  headerShape: {
    width: wp(100),
    height: hp(20),
  },

  avatarContainer: {
    height: hp(12),
    width: hp(12),
    alignSelf: 'center',
  },

  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: -12,
    padding: 7,
    borderRadius: 50,
    backgroundColor: 'white',
    shadowColor: theme.colors.textLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 7,
  },

  userInfo: {
    alignItems: 'center',
    gap: 4,
  },

  userName: {
    fontSize: hp(3),
    fontWeight: '500',
    color: theme.colors.textDark,
  },

  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    alignSelf: 'flex-start',
  },

  infoText: {
    fontSize: hp(1.6),
    fontWeight: '500',
    color: theme.colors.textLight,
  },

  logoutButton: {
    position: 'absolute',
    right: 0,
    padding: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: '#fee2e2',
  },

  listStyle: {
    paddingHorizontal: wp(4),
    paddingBottom: 30,
  },

  noPosts: {
    fontSize: hp(2),
    textAlign: 'center',
    color: theme.colors.text,
  },
})
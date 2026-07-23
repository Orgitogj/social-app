import { ScrollView, StyleSheet, View,Text, TouchableOpacity, Alert, TextInput } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { createComment, fetchPostDetails } from '@/services/postService';
import { hp, wp } from '@/helpers/common';
import { theme } from '@/constants/theme';
import PostCard from '@/components/PostCard';
import { useAuth } from '@/contexts/AuthContexts';
import Loading from '@/components/Loading';
import Input from '@/components/Input';
import Icon from '@/assets/icons';

interface PostType {
  id: string;
  body?: string;
  file?: string | null;
  userId: string;
  created_at?: string;
  user: {
    id: string;
    name: string;
    image?: string | null;
  };
  postLikes: any[];
  comments?: any[];   
}

const PostDetails = () => {

  const { postId } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<PostType | null>(null);
  const [startLoading, setStartLoading] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const commentRef = useRef<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPostDetails();
  }, []);

  const getPostDetails = async () => {
    let res = await fetchPostDetails(postId as string);
    if (res.success) setPost(res.data);
    setStartLoading(false);
  }

  const onNewComment = async () => {

    if (!commentRef.current) return null;
    let data = {
      userId: user?.id,
      postId: post?.id,
      text: commentRef.current
    }
    setLoading(true);
    let res = await createComment(data);
    setLoading(false);
    if (res.success) {

      inputRef?.current?.clear();
      commentRef.current = "";
    } else {
      Alert.alert('Comment', res.msg)
    }
  }

  if (startLoading) {
    return (
      <View style={styles.center}>
        <Loading />
      </View>
    )
  }


  if(!post){
    return (
      <View style={[styles.center,{justifyContent:'flex-start',marginTop:100}]}>

        <Text style={styles.notFound}></Text>
      </View>
    )
  }
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <PostCard
          item={{...post,comments:[{count:post?.comments?.length}]}}
          currentUser={user}
          router={router}
          hasShadow={false}
          showMoreIcon={false}
        />

        <View style={styles.inputContainer}>
          <Input
            inputRef={inputRef}
            placeholder="Type comment"
            onChangeText={value => commentRef.current = value}
            placeholderTextColor={theme.colors.textLight}
            containerStyle={{ flex: 1, height: hp(6.2), borderRadius: theme.radius.xl }} />

          {

            loading ? (
              <View style={styles.loading}>
                <Loading size="small" />
              </View>
            ) : (

              <TouchableOpacity style={styles.sendIcon} onPress={onNewComment}>
                <Icon name="send" color={theme.colors.primaryDark} />
              </TouchableOpacity>
            )
          }

        </View>


        <View style={{marginVertical:15,gap:17}}>

          {
            post?.comments?.map(comment=>
              
            )
          }
        </View>
      </ScrollView>
    </View>
  )
}

export default PostDetails

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: wp(7),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  list: {
    paddingHorizontal: wp(4),
  },
  sendIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    borderCurve: 'continuous',
    height: hp(5.8),
    width: hp(5.8)
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  notFound: {
    fontSize: hp(2.5),
    color: theme.colors.text,
    fontWeight: theme.fonts.medium as any,
  },
  loading: {
    height: hp(5.8),
    width: hp(5.8),
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scale: 1.3 }]
  }
})
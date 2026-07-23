import React, { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import moment from 'moment';
import RenderHtml from 'react-native-render-html';
import { theme } from '@/constants/theme';
import { hp, wp, stripHtmlTags } from '@/helpers/common';
import Avatar from './Avatar';
import Icon from '@/assets/icons';
import { Image } from 'expo-image';
import { downloadFile, getSupabaseFileUrl } from '@/services/imageService';
import { Video, ResizeMode } from 'expo-av';
import { createPostLike, removePostLike } from '../services/postService'
import Loading from './Loading';

type PostCardProps = {
  item: any;
  currentUser: any;
  router: any;
  hasShadow?: boolean;
  showMoreIcon?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
};

const textStyle = {
  color: theme.colors.dark,
  fontSize: hp(1.5)
};

const tagsStyles = {
  div: textStyle,
  p: textStyle,
  ol: textStyle,
  h1: {
    color: theme.colors.dark
  },
  h4: {
    color: theme.colors.dark
  }
};

const PostCard = ({
  item,
  currentUser,
  router,
  hasShadow = true,
  showMoreIcon=true,
  showDelete=false,
  onDelete=()=>{

  },
   onEdit=()=>{

  }
}: PostCardProps) => {
  const shadowStyles = {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  };

  const [loading,setLoading]=useState(false);

  const [likes, setLikes] = useState<any[]>([]);

  useEffect(() => {
    setLikes(item?.postLikes || []);
  }, [item]);

 const openPostDetails = () => {

  if(!showMoreIcon){
    return null;
  }
  router.push({ pathname: '/main/postDetails', params: { postId: item?.id } })
}
  const onLike = async () => {
    if (liked) {
      let updatedLikes = likes.filter(like => like.userId !== currentUser?.id);
      setLikes([...updatedLikes]);

      let res = await removePostLike(item?.id, currentUser?.id);

      if (!res.success) {
        Alert.alert('Post', 'Like was not removed');
        setLikes(likes);
      }
    } else {
      let data = {
        userId: currentUser?.id,
        postId: item?.id
      };
      setLikes([...likes, data]);

      let res = await createPostLike(data);

      if (!res.success) {
        Alert.alert('Post', 'Like was not added');
        setLikes(likes);
      }
    }
  }

  const onShare = async () => {
    let content: { message: string; url?: string } = {
      message: stripHtmlTags(item?.body || '')
    };

    if (item?.file) {
      setLoading(true);
      let url = await downloadFile(getSupabaseFileUrl(item?.file)?.uri);
      setLoading(false);
      if (url) {
        content.url = url;
      }
    }

    Share.share(content);
  }


  const liked = likes.filter(like => like.userId === currentUser?.id)[0] ? true : false;

  const createdAt = moment(item?.created_at).format('MMM D');

  return (
    <View style={[styles.container, hasShadow && shadowStyles]}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar
            size={hp(4.5)}
            uri={item?.user?.image}
            rounded={theme.radius.md}
          />

          <View style={{ gap: 2 }}>
            <Text style={styles.username}>
              {item?.user?.name}
            </Text>

            <Text style={styles.postTime}>
              {createdAt}
            </Text>
          </View>
        </View>


{
  showMoreIcon &&(
 <TouchableOpacity onPress={openPostDetails}>
          <Icon
            name="threeDotsHorizontal"
            size={hp(3.4)}
            strokeWidth={3}
            color={theme.colors.text}
          />
        </TouchableOpacity>
  )
}

{
  showDelete && currentUser.id===item?.userId&&(
    
  )
}
       
      </View>

      <View style={styles.content}>
        <View style={styles.postBody}>
          {item?.body && (
            <RenderHtml
              contentWidth={wp(100)}
              source={{ html: item?.body }}
              tagsStyles={tagsStyles}
            />
          )}
        </View>

        {item?.file && item?.file.includes('postImages') && (
          <Image
            source={getSupabaseFileUrl(item?.file)}
            transition={100}
            style={styles.postMedia}
            contentFit="cover"
            onError={(e) => console.log('Image load error:', e)}
          />
        )}

        {item?.file && item?.file.includes('postVideos') && (
          <Video
            style={[styles.postMedia, { height: hp(30) }]}
            source={{ uri: getSupabaseFileUrl(item?.file)?.uri || '' }}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            isLooping
            onError={(e) => console.log('Video load error:', e)}
          />
        )}
      </View>

      <View style={styles.footer}>
  <TouchableOpacity style={styles.footerButton} onPress={onLike}>
    <Icon
      name="heart"
      size={24}
      strokeWidth={2}
      fill={liked ? theme.colors.rose : 'transparent'}
      color={liked ? theme.colors.rose : theme.colors.textLight}
    />
    <Text style={styles.count}>{likes?.length || 0}</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.footerButton} onPress={openPostDetails}>
    <Icon
      name="comment"
      size={24}
      strokeWidth={2}
      color={theme.colors.textLight}
    />
    
      <Text style={styles.count}>
        {item?.comments?.[0]?.count || 0}
      </Text>
  </TouchableOpacity>

  {
    loading ? (
      <Loading size="small" />
    ) : (
      <TouchableOpacity style={styles.footerButton} onPress={onShare}>
        <Icon
          name="share"
          size={24}
          strokeWidth={2}
          color={theme.colors.textLight}
        />
      </TouchableOpacity>
    )
  }
</View>
    </View>
  );
};

export default PostCard;

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 15,
    borderRadius: theme.radius.xxl * 1.1,
    borderCurve: 'continuous',
    padding: 10,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: theme.colors.gray,
    shadowColor: '#000',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  username: {
    fontSize: hp(1.7),
    color: theme.colors.textDark,
    fontWeight: theme.fonts.medium as any,
  },

  postTime: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
    fontWeight: theme.fonts.medium as any,
  },

  content: {
    gap: 10,
  },

  postBody: {
    marginLeft: 5,
  },

  postMedia: {
    height: hp(40),
    width: '100%',
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },

  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 5,
  },

  count: {
    color: theme.colors.text,
    fontSize: hp(1.8),
  },
});
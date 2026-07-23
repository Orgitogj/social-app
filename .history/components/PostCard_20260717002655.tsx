import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import moment from 'moment';
import RenderHtml from 'react-native-render-html';
import { theme } from '@/constants/theme';
import { hp,wp } from '@/helpers/common';
import Avatar from './Avatar';
import Icon from '@/assets/icons';
import { Image } from 'expo-image';
import { getSupabaseFileUrl } from '@/services/imageService';
import { Video } from 'expo-av';

type PostCardProps = {
  item: any;
  currentUser: any;
  router: any;
  hasShadow?: boolean;
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

  const openPostDetails=()=>{

  }

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

        <TouchableOpacity onPress={openPostDetails}>
          <Icon
            name="threeDotsHorizontal"
            size={hp(3.4)}
            strokeWidth={3}
            color={theme.colors.text}
          />
        </TouchableOpacity>
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

{
  item?.file&& item?.file?.includes('postImages')&&(
    <Image
     source={getSupabaseFileUrl(item?.file)}
     transition={100}
     style={styles.postMedia}
     contentFit='cover'/>
  )
}{
  item?.file&&item?.file.includes('postVideos')&&(
    <Video
    style={[styles.postMedia,{height:hp(30)}]}
    source={getSupabaseFileUrl(item?.file)}
    useNativeControls
    res
    isLooping/>
  )
}


        
      </View>

      <View style={styles.footer}>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.footerButton}>
            <Icon
              name="heart"
              size={24}
              strokeWidth={2}
              color={theme.colors.text}
            />
            <Text style={styles.count}>
              {item?.postLikes?.length || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.footerButton}>
            <Icon
              name="comment"
              size={24}
              strokeWidth={2}
              color={theme.colors.text}
            />
            <Text style={styles.count}>
              {item?.comments?.length || 0}
            </Text>
          </TouchableOpacity>
        </View>
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
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native'
import React, { useRef, useState } from 'react'
import ScreenWrapper from '@/components/screenWrapper'
import Header from '@/components/Header'
import { theme } from '@/constants/theme'
import { hp, wp } from '@/helpers/common'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContexts'
import RichTextEditor from '@/components/RichTextEditor'
import { useRouter } from 'expo-router'
import Icon from '@/assets/icons'
import Button from '@/components/Button'
import * as ImagePicker from 'expo-image-picker'
import { getSupabaseFileUrl } from '@/services/imageService'
import { Video, ResizeMode } from 'expo-av'

const NewPost = () => {
  const bodyRef = useRef("");
  const editorRef = useRef(null);
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<any>(null);

  const onPick = async (isImage: boolean) => {
    let mediaConfig: any = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    }

    if (!isImage) {
      mediaConfig = {
        mediaTypes: ['videos'],
        allowsEditing: true
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync(mediaConfig);

    // Debug — hiqe pas testimit
    console.log('PICKER RESULT:', JSON.stringify(result, null, 2));

    if (!result.canceled) {
      setFile(result.assets[0]);
    }
  }

  const onSubmit = async () => {

  }

  const isLocal = (file: any) => {
    if (!file) return null;
    if (typeof file == 'object') return true;
    return false;
  }

  const getFileType = (file: any) => {
    if (!file) {
      return null;
    }

    if (isLocal(file)) {
      // 1. provo file.type ('image' | 'video')
      if (file.type === 'image' || file.type === 'video') {
        return file.type;
      }
      // 2. fallback: nxirre nga mimeType (p.sh. "video/mp4")
      if (file.mimeType) {
        if (file.mimeType.startsWith('video')) return 'video';
        if (file.mimeType.startsWith('image')) return 'image';
      }
      // 3. fallback: nxirre nga vetë URI (extension)
      if (file.uri) {
        if (/\.(mp4|mov|m4v|avi|webm)$/i.test(file.uri)) return 'video';
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.uri)) return 'image';
      }
      return null;
    }

    // file nga Supabase (string path)
    if (typeof file === 'string') {
      if (file.includes('postImage')) return 'image';
      if (file.includes('postVideo')) return 'video';
    }

    return null;
  }

  const getFileUri = (file: any) => {
    if (!file) return null;
    if (isLocal(file)) {
      return file.uri;
    }
    return getSupabaseFileUrl(file)?.uri;
  }

  return (
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        <Header title="Create post" />
        <ScrollView contentContainerStyle={{ gap: 20 }}>
          <View style={styles.header}>
            <Avatar
              uri={user?.image}
              size={hp(6.5)}
              rounded={theme.radius.xl}
            />
            <View style={{ gap: 2 }}>
              <Text style={styles.username}>
                {user && user.name}
              </Text>
              <Text style={styles.publicText}>
                Public
              </Text>
            </View>
          </View>

          <View style={styles.textEditor}>
            <RichTextEditor editorRef={editorRef} onChange={body => bodyRef.current = body} />
          </View>

          {
            file && (
              <View style={styles.file}>
                {
                  getFileType(file) == 'video' ? (
                    <Video
                      style={{ width: '100%', height: '100%' }}
                      source={{ uri: getFileUri(file) }}
                      useNativeControls
                      resizeMode={ResizeMode.COVER}
                      isLooping
                      onError={(e) => console.log('VIDEO ERROR:', e)}
                      onLoad={() => console.log('VIDEO LOADED OK')}
                    />
                  ) : (
                    <Image
                      source={{ uri: getFileUri(file) }}
                      resizeMode='cover'
                      style={{ width: '100%', height: '100%' }}
                    />
                  )
                }

                <TouchableOpacity style={styles.closeIcon} onPress={() => setFile(null)}>
                  <Icon name="delete" size={22} color="white" />
                </TouchableOpacity>
              </View>
            )
          }

          <View style={styles.media}>
            <Text style={styles.addImageText}>Add to your post</Text>
            <View style={styles.mediaIcons}>
              <TouchableOpacity onPress={() => onPick(true)}>
                <Icon name="image" size={30} color={theme.colors.dark} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onPick(false)}>
                <Icon name="video" size={33} color={theme.colors.dark} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <Button
          buttonStyle={{ height: hp(6.2) }}
          title="Post"
          loading={loading}
          hasShadow={false}
          onPress={onSubmit}
        />
      </View>
    </ScreenWrapper>
  )
}

export default NewPost

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 30,
    paddingHorizontal: wp(4),
    gap: 15,
  },
  title: {
    fontSize: hp(2.5),
    fontWeight: theme.fonts.semibold as any,
    color: theme.colors.text,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold as any,
    color: theme.colors.text,
    marginLeft: 15
  },
  avatar: {
    height: hp(6.5),
    width: hp(6.5),
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)'
  },
  publicText: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.medium as any,
    color: theme.colors.textLight,
    marginLeft: 15
  },
  textEditor: {},
  media: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    borderColor: theme.colors.gray
  },
  mediaIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  addImageText: {
    fontSize: hp(1.9),
    fontWeight: theme.fonts.semibold as any,
    color: theme.colors.text,
  },
  imageIcon: {
    borderRadius: theme.radius.md,
  },
  file: {
    height: hp(30),
    width: '100%',
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    borderCurve: 'continuous'
  },
  video: {},
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,0,0,0.6)',
    padding: 6,
    borderRadius: 50,
  }
})
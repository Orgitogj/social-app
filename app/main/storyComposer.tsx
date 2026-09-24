import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/assets/icons';
import Header from '@/components/Header';
import ScreenWrapper from '@/components/screenWrapper';
import AudienceSelector from '@/components/stories/AudienceSelector';
import StoryMediaPreview from '@/components/stories/StoryMediaPreview';
import StorySourcePicker from '@/components/stories/StorySourcePicker';
import StoryUploadProgress from '@/components/stories/StoryUploadProgress';
import { STORY_CAPTION_LIMIT } from '@/constants';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContexts';
import { storyErrorMessage } from '@/helpers/stories';
import { isPublishing, useStoryComposer } from '@/hooks/useStoryComposer';
import { useCloseFriendsAvailable } from '@/hooks/useStories';
import type { StoryMediaSource } from '@/services/storyMediaService';
import type { StoryAudience } from '@/types/domain';

export default function StoryComposer() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const composer = useStoryComposer(user?.id);
  const { draft, upload, choose, publish, discard } = composer;
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState<StoryAudience>('followers');
  const closeFriends = useCloseFriendsAvailable(audience === 'close_friends');
  const publishing = isPublishing(upload);
  const locked = publishing || upload.status === 'success';
  const audienceBlocked = audience === 'close_friends' && closeFriends.data !== true;
  const discardRef = useRef(discard);

  useEffect(() => { discardRef.current = discard; }, [discard]);
  useEffect(() => () => { discardRef.current(); }, []);

  const leavePreview = useCallback(() => {
    if (locked) return;
    discard();
    setCaption('');
  }, [discard, locked]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (locked) return true;
      if (!draft) return false;
      leavePreview();
      return true;
    });
    return () => subscription.remove();
  }, [draft, leavePreview, locked]));

  const onSelect = useCallback(async (source: StoryMediaSource) => {
    const status = await choose(source);
    if (status === 'denied') {
      Alert.alert('Camera access needed', 'Allow camera access to capture a story. You can change this in Settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
      ]);
    } else if (status === 'unavailable') {
      Alert.alert('Unavailable', source === 'camera' ? 'The camera is not available on this device.' : 'Your gallery could not be opened.');
    }
  }, [choose]);

  const onPublish = useCallback(async () => {
    if (locked || audienceBlocked) return;
    const story = await publish({ caption, audience });
    if (story) router.back();
  }, [audience, audienceBlocked, caption, locked, publish, router]);

  const errorMessage = upload.status === 'failed' && upload.error ? storyErrorMessage(upload.error) : null;

  if (!draft) {
    return (
      <ScreenWrapper bg="white">
        <View style={styles.pickerScreen}>
          <Header title="Add to story" />
          <Text style={styles.pickerIntro}>Share a photo or a video of up to 60 seconds. Stories disappear after 24 hours.</Text>
          <StorySourcePicker onSelect={onSelect} busy={upload.status === 'preparing'} />
          {errorMessage ? <Text style={styles.pickerError} accessibilityRole="alert">{errorMessage}</Text> : null}
        </View>
      </ScreenWrapper>
    );
  }

  const publishLabel = upload.status === 'failed' ? 'Try again' : audience === 'close_friends' ? 'Share to Close Friends' : 'Share to story';
  const publishDisabled = locked || audienceBlocked || !user;

  return (
    <View style={styles.editor}>
      <StatusBar style="light" />
      <StoryMediaPreview draft={draft} paused={locked} />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={leavePreview} disabled={locked} hitSlop={10} accessibilityRole="button" accessibilityLabel="Discard and choose other media" style={styles.iconButton}>
          <Icon name="arrowLeft" size={24} color="white" strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.topTitle} accessibilityRole="header">New story</Text>
        <View style={styles.iconButton} />
      </View>
      <KeyboardAvoidingView behavior="padding" style={styles.bottomArea} pointerEvents="box-none">
        <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
          {errorMessage ? <Text style={styles.editorError} accessibilityRole="alert">{errorMessage}</Text> : null}
          <StoryUploadProgress upload={upload} />
          <View style={styles.captionBox}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              editable={!locked}
              placeholder="Add a caption…"
              placeholderTextColor={theme.colors.storyViewed}
              maxLength={STORY_CAPTION_LIMIT}
              multiline
              style={styles.caption}
              accessibilityLabel="Story caption"
            />
            <Text style={styles.counter} accessibilityLabel={`${caption.length} of ${STORY_CAPTION_LIMIT} characters`}>{caption.length}/{STORY_CAPTION_LIMIT}</Text>
          </View>
          <AudienceSelector value={audience} onChange={setAudience} closeFriendsAvailable={closeFriends.data} disabled={locked} />
          <Pressable
            onPress={onPublish}
            disabled={publishDisabled}
            accessibilityRole="button"
            accessibilityLabel={publishLabel}
            accessibilityState={{ disabled: publishDisabled, busy: publishing }}
            style={({ pressed }) => [styles.publish, { backgroundColor: audience === 'close_friends' ? theme.colors.closeFriends : theme.colors.primary }, publishDisabled && styles.publishDisabled, pressed && styles.pressed]}
          >
            <Text style={styles.publishText}>{publishLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerScreen: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 18,
  },
  pickerIntro: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  pickerError: {
    fontSize: 14,
    color: theme.colors.rose,
    textAlign: 'center',
  },
  editor: {
    flex: 1,
    backgroundColor: theme.colors.media,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  topTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: theme.fonts.semibold,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay,
  },
  bottomArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: theme.colors.overlay,
  },
  editorError: {
    color: 'white',
    backgroundColor: theme.colors.rose,
    padding: 10,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    fontSize: 14,
  },
  captionBox: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
  },
  caption: {
    color: 'white',
    fontSize: 16,
    maxHeight: 110,
  },
  counter: {
    alignSelf: 'flex-end',
    color: theme.colors.storyViewed,
    fontSize: 11,
    paddingBottom: 4,
  },
  publish: {
    minHeight: 52,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  publishText: {
    color: 'white',
    fontSize: 16,
    fontWeight: theme.fonts.bold,
  },
});

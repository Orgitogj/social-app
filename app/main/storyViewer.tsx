import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, AppState, KeyboardAvoidingView, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import StoryPlayer, { isTransientMediaError } from '@/components/stories/StoryPlayer';
import StoryUnavailable from '@/components/stories/StoryUnavailable';
import StoryCaption from '@/components/stories/StoryCaption';
import StoryInteractionStatus from '@/components/stories/StoryInteractionStatus';
import StoryReactionBar from '@/components/stories/StoryReactionBar';
import StoryReplyBar from '@/components/stories/StoryReplyBar';
import StoryViewCount from '@/components/stories/StoryViewCount';
import StoryViewersSheet from '@/components/stories/StoryViewersSheet';
import StoryViewerHeader from '@/components/stories/StoryViewerHeader';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContexts';
import { uuidSchema } from '@/helpers/validation';
import { refreshStoryTray, storyKeys, useMarkStoryViewed, useStory } from '@/hooks/useStories';
import { useStoryInteraction } from '@/hooks/useStoryInteraction';
import { useStoryViewer, type StoryViewerScope } from '@/hooks/useStoryViewer';

export default function StoryViewerScreen() {
  const params = useLocalSearchParams<{ authorId?: string; storyId?: string; scope?: string }>();
  const authorId = uuidSchema.safeParse(params.authorId);
  const linked = params.storyId !== undefined;
  const storyId = uuidSchema.safeParse(params.storyId);
  const scope: StoryViewerScope = params.scope === 'author' ? 'author' : 'tray';
  const router = useRouter();
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main/home');
  }, [router]);

  useEffect(() => {
    if (!linked && !authorId.success) close();
  }, [authorId.success, close, linked]);

  if (linked) return storyId.success ? <LinkedStory storyId={storyId.data} onClose={close} /> : <StoryUnavailable onClose={close} />;
  return authorId.success ? <StoryViewer authorId={authorId.data} scope={scope} onClose={close} /> : <View style={styles.screen} />;
}

function LinkedStory({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const story = useStory(storyId);
  if (story.isPending) return <StoryUnavailable onClose={onClose} loading />;
  if (story.isError) return isTransientMediaError(story.error) ? <StoryUnavailable onClose={onClose} onRetry={() => { void story.refetch(); }} /> : <StoryUnavailable onClose={onClose} />;
  if (!story.data) return <StoryUnavailable onClose={onClose} />;
  return <StoryViewer authorId={story.data.author_id} scope="author" initialStoryId={storyId} onClose={onClose} />;
}

type StoryViewerProps = { authorId: string; scope: StoryViewerScope; initialStoryId?: string; onClose: () => void };

function StoryViewer({ authorId, scope, initialStoryId, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const viewer = useStoryViewer(authorId, { scope, initialStoryId });
  const markViewed = useMarkStoryViewed(user?.id);
  const [progress] = useState(() => new Animated.Value(0));
  const [holding, setHolding] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [appActive, setAppActive] = useState(() => AppState.currentState !== 'background');
  const [viewersOpen, setViewersOpen] = useState(false);
  const [replyFocused, setReplyFocused] = useState(false);
  const paused = holding || manualPause || !focused || !appActive || viewersOpen || replyFocused;
  const { story, markUnavailable, revalidate } = viewer;
  const own = Boolean(story && user && story.author_id === user.id);
  const interaction = useStoryInteraction(story && !own ? story.id : undefined);
  const { reset: resetInteraction } = interaction;

  useEffect(() => { resetInteraction(); }, [resetInteraction, story?.id]);

  const openViewers = useCallback(() => {
    if (!story || !own) return;
    setViewersOpen(true);
    void client.invalidateQueries({ queryKey: storyKeys.author(story.author_id), exact: true });
  }, [client, own, story]);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', next => {
      setAppActive(next === 'active');
      if (next === 'active' && previous !== 'active') revalidate();
      if (next !== 'active') setHolding(false);
      previous = next;
    });
    return () => subscription.remove();
  }, [revalidate]);

  useEffect(() => {
    if (viewer.closed) onClose();
  }, [onClose, viewer.closed]);

  useEffect(() => () => { void refreshStoryTray(client); }, [client]);

  const onViewed = useCallback(() => {
    if (story) void markViewed(story);
  }, [markViewed, story]);

  const onUnavailable = useCallback(() => {
    if (story) markUnavailable(story.id);
  }, [markUnavailable, story]);

  const togglePause = useCallback(() => setManualPause(value => !value), []);

  const [translateY] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const gesture = useRef({ onClose, reduceMotion, onSwipeUp: openViewers });

  useEffect(() => { gesture.current = { onClose, reduceMotion, onSwipeUp: openViewers }; }, [onClose, openViewers, reduceMotion]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const [panResponder] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, state) => Math.abs(state.dy) > 12 && Math.abs(state.dy) > Math.abs(state.dx) * 1.5,
    onPanResponderGrant: () => setHolding(true),
    onPanResponderMove: (_, state) => {
      if (!gesture.current.reduceMotion) translateY.setValue(Math.max(0, state.dy));
    },
    onPanResponderRelease: (_, state) => {
      setHolding(false);
      if (state.dy < -80) {
        translateY.setValue(0);
        gesture.current.onSwipeUp();
        return;
      }
      if (state.dy > 120 || state.vy > 1.2) {
        gesture.current.onClose();
        return;
      }
      if (gesture.current.reduceMotion) translateY.setValue(0);
      else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      setHolding(false);
      translateY.setValue(0);
    },
  }));

  if (viewer.storyMissing) return <StoryUnavailable onClose={onClose} />;

  return (
    <Animated.View style={[styles.screen, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
      <StatusBar hidden />
      {story ? (
        <StoryPlayer key={`${story.id}:${viewer.restartKey}`} story={story} paused={paused} progress={progress} onViewed={onViewed} onComplete={viewer.next} onUnavailable={onUnavailable} />
      ) : viewer.isError ? (
        <View style={styles.center}>
          <Text style={styles.message}>Stories could not be loaded.</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => { void viewer.retry(); }} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>Try again</Text></Pressable>
            <Pressable onPress={onClose} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>Close</Text></Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color="white" size="large" accessibilityLabel="Loading stories" />
        </View>
      )}
      {story ? (
        <View style={[styles.zones, { top: insets.top + 64 }]}>
          <Pressable
            style={styles.previousZone}
            onPress={viewer.previous}
            onLongPress={() => setHolding(true)}
            onPressOut={() => setHolding(false)}
            delayLongPress={200}
            accessibilityRole="button"
            accessibilityLabel="Previous story"
          />
          <Pressable
            style={styles.nextZone}
            onPress={viewer.next}
            onLongPress={() => setHolding(true)}
            onPressOut={() => setHolding(false)}
            delayLongPress={200}
            accessibilityRole="button"
            accessibilityLabel="Next story"
          />
        </View>
      ) : null}
      {story && viewer.index !== null ? (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <StoryViewerHeader story={story} count={viewer.count} index={viewer.index} progress={progress} paused={paused} onTogglePause={togglePause} onClose={onClose} />
        </View>
      ) : (
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close stories" style={[styles.fallbackClose, { top: insets.top + 8 }]}>
          <Text style={styles.actionText}>Close</Text>
        </Pressable>
      )}
      {story ? (
        <KeyboardAvoidingView behavior="padding" style={styles.bottomArea} pointerEvents="box-none">
          <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
            {story.caption ? <StoryCaption caption={story.caption} /> : null}
            {own ? <StoryViewCount count={story.view_count} onPress={openViewers} /> : null}
            {!own && story.can_reply ? (
              <>
                <StoryReactionBar onReact={emoji => { void interaction.react(emoji); }} disabled={interaction.state.status === 'sending'} sentReaction={interaction.state.status === 'sent' ? interaction.state.reaction : null} />
                <StoryReplyBar authorName={story.author?.name ?? 'this story'} sending={interaction.state.status === 'sending'} onSend={interaction.reply} onFocusChange={setReplyFocused} />
                <StoryInteractionStatus state={interaction.state} canRetry={interaction.canRetry} onRetry={() => { void interaction.retry(); }} />
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      ) : null}
      {story && own ? <StoryViewersSheet storyId={story.id} count={story.view_count} visible={viewersOpen} onClose={() => setViewersOpen(false)} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.media,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  message: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: theme.fonts.semibold,
  },
  zones: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  previousZone: {
    flex: 3,
  },
  nextZone: {
    flex: 7,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  fallbackClose: {
    position: 'absolute',
    right: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomPanel: {
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
});

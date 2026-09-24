import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, AppState, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import StoryPlayer from '@/components/stories/StoryPlayer';
import StoryViewerHeader from '@/components/stories/StoryViewerHeader';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContexts';
import { uuidSchema } from '@/helpers/validation';
import { refreshStoryTray, useMarkStoryViewed } from '@/hooks/useStories';
import { useStoryViewer } from '@/hooks/useStoryViewer';

export default function StoryViewerScreen() {
  const params = useLocalSearchParams<{ authorId?: string }>();
  const authorId = uuidSchema.safeParse(params.authorId);
  const router = useRouter();
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main/home');
  }, [router]);

  useEffect(() => {
    if (!authorId.success) close();
  }, [authorId.success, close]);

  return authorId.success ? <StoryViewer authorId={authorId.data} onClose={close} /> : <View style={styles.screen} />;
}

function StoryViewer({ authorId, onClose }: { authorId: string; onClose: () => void }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const viewer = useStoryViewer(authorId);
  const markViewed = useMarkStoryViewed(user?.id);
  const [progress] = useState(() => new Animated.Value(0));
  const [holding, setHolding] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [appActive, setAppActive] = useState(() => AppState.currentState !== 'background');
  const paused = holding || manualPause || !focused || !appActive;
  const { story, markUnavailable, revalidate } = viewer;

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
  const gesture = useRef({ onClose, reduceMotion });

  useEffect(() => { gesture.current = { onClose, reduceMotion }; }, [onClose, reduceMotion]);

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
    onMoveShouldSetPanResponderCapture: (_, state) => state.dy > 12 && Math.abs(state.dy) > Math.abs(state.dx) * 1.5,
    onPanResponderGrant: () => setHolding(true),
    onPanResponderMove: (_, state) => {
      if (!gesture.current.reduceMotion) translateY.setValue(Math.max(0, state.dy));
    },
    onPanResponderRelease: (_, state) => {
      setHolding(false);
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
      {story?.caption ? (
        <View style={[styles.caption, { paddingBottom: insets.bottom + 20 }]} pointerEvents="none">
          <Text style={styles.captionText} importantForAccessibility="no">{story.caption}</Text>
        </View>
      ) : null}
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
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.overlay,
  },
  captionText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
});

import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { StoryUploadState } from '@/types/domain';

export function uploadStatusLabel(upload: StoryUploadState) {
  switch (upload.status) {
    case 'preparing': return 'Preparing media…';
    case 'uploading': return `Uploading ${Math.round(upload.progress * 100)}%`;
    case 'publishing': return 'Publishing…';
    case 'success': return 'Shared to your story';
    default: return '';
  }
}

function StoryUploadProgress({ upload }: { upload: StoryUploadState }) {
  const label = uploadStatusLabel(upload);
  if (!label) return null;
  const determinate = upload.status === 'uploading';
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={determinate ? { min: 0, max: 100, now: Math.round(upload.progress * 100) } : undefined} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        {upload.status !== 'success' ? <ActivityIndicator color="white" size="small" /> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round((upload.status === 'uploading' ? upload.progress : upload.status === 'preparing' ? 0 : 1) * 100)}%` }]} />
      </View>
    </View>
  );
}

export default memo(StoryUploadProgress);

const styles = StyleSheet.create({
  container: {
    gap: 8,
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.overlay,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: theme.fonts.semibold,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: theme.colors.overlayLight,
  },
  fill: {
    height: 4,
    backgroundColor: theme.colors.primary,
  },
});

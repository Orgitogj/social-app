import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Message, StoryMessageContext } from '@/types/domain';
import { storyMessageLabel } from '@/helpers/chat';
import { useStoryMediaUrl } from '@/hooks/useStories';
import { theme } from '@/constants/theme';

export function storyPreviewDescription(story: StoryMessageContext) {
  const kind = story.media_type === 'video' ? 'Video story' : 'Photo story';
  return story.available ? kind : `${kind} · no longer available`;
}

function StoryThumbnail({ story }: { story: StoryMessageContext }) {
  const media = useStoryMediaUrl(story.available ? story.preview_path : null, story.expires_at ?? '');
  if (media.data) return <Image source={media.data} style={styles.thumbnail} contentFit="cover" cachePolicy="memory" transition={120} accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.thumbnail, styles.placeholder]}>
      <Text style={styles.placeholderIcon}>{story.media_type === 'video' ? '▶' : '◻'}</Text>
    </View>
  );
}

function StoryMessageCard({ message, mine }: { message: Message; mine: boolean }) {
  const story = message.story;
  if (!story) return null;
  const label = storyMessageLabel(message.message_type, message.text, mine);
  const description = storyPreviewDescription(story);
  return (
    <View style={styles.card} accessible accessibilityLabel={`${label}. ${description}`}>
      <StoryThumbnail story={story} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
        {message.message_type === 'story_reaction' ? <Text style={styles.reaction}>{message.text}</Text> : null}
      </View>
    </View>
  );
}

export default memo(StoryMessageCard);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 10, alignItems: 'center', borderLeftWidth: 3, borderLeftColor: theme.colors.primary, paddingLeft: 8 },
  thumbnail: { width: 56, height: 90, borderRadius: theme.radius.sm, backgroundColor: theme.colors.gray },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { color: theme.colors.textLight, fontSize: 20 },
  copy: { flexShrink: 1, gap: 3 },
  label: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: theme.fonts.semibold as '600' },
  description: { color: theme.colors.textLight, fontSize: 12 },
  reaction: { fontSize: 34, lineHeight: 40 },
});

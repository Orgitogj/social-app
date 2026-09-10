import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Message } from '@/types/domain';
import { getMessageMediaUrl } from '@/services/chatService';
import { formatMessageTime } from '@/helpers/chat';
import { theme } from '@/constants/theme';
import { MessageStatus } from './MessageStatus';
import { ReactionBar } from './ReactionBar';
import { ReplyPreview } from './ReplyPreview';

function MessageImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getMessageMediaUrl(path).then(result => { if (active && result.success) setUrl(result.data); });
    return () => { active = false; };
  }, [path]);
  return url ? <Image source={url} style={styles.image} contentFit="cover" transition={150} /> : <View style={styles.imageLoading}><Text style={styles.imageLoadingText}>Loading photo…</Text></View>;
}

type Props = {
  message: Message;
  mine: boolean;
  replyLabel: string;
  onLongPress: (message: Message) => void;
  onReaction: (emoji: string) => void;
  onRetry: (message: Message) => void;
};

export function MessageBubble({ message, mine, replyLabel, onLongPress, onReaction, onRetry }: Props) {
  const deleted = Boolean(message.deleted_at);
  return <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
    <Pressable onLongPress={() => onLongPress(message)} delayLongPress={350} onPress={() => message.status === 'failed' && onRetry(message)} style={[styles.bubble, mine ? styles.mine : styles.other, deleted && styles.deleted]}>
      {message.reply_to ? <ReplyPreview reply={message.reply_to} label={replyLabel} /> : null}
      {deleted ? <Text style={styles.deletedText}>This message was deleted</Text> : null}
      {!deleted && message.media_path && message.message_type === 'image' ? <MessageImage path={message.media_path} /> : null}
      {!deleted && message.text ? <Text style={[styles.text, mine && styles.mineText]}>{message.text}</Text> : null}
      <View style={styles.meta}>
        <Text style={styles.time}>{formatMessageTime(message.created_at)}</Text>
        {mine ? <MessageStatus status={message.status} /> : null}
      </View>
    </Pressable>
    {!deleted ? <ReactionBar reactions={message.reactions} onPress={onReaction} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { maxWidth: '82%', marginVertical: 3 },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: theme.radius.lg, gap: 6 },
  mine: { backgroundColor: '#dff8ea', borderBottomRightRadius: 4 },
  other: { backgroundColor: '#f1f1f1', borderBottomLeftRadius: 4 },
  deleted: { backgroundColor: '#f6f6f6' },
  text: { color: theme.colors.textDark, fontSize: 15, lineHeight: 21 },
  mineText: { color: '#154b31' },
  deletedText: { color: theme.colors.textLight, fontStyle: 'italic', fontSize: 14 },
  meta: { flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'flex-end' },
  time: { color: theme.colors.textLight, fontSize: 10 },
  image: { width: 220, height: 220, borderRadius: theme.radius.md },
  imageLoading: { width: 220, height: 160, borderRadius: theme.radius.md, backgroundColor: theme.colors.gray, alignItems: 'center', justifyContent: 'center' },
  imageLoadingText: { color: theme.colors.textLight, fontSize: 12 },
});

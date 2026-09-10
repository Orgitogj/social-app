import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { MessageReplyPreview } from '@/types/domain';
import { uploadMessageImage } from '@/services/chatService';
import { theme } from '@/constants/theme';
import { ReplyPreview } from './ReplyPreview';

type Draft = { text: string; mediaPath?: string | null; mimeType?: string | null; replyToMessageId?: string | null };
type Props = { userId: string; replyTo?: MessageReplyPreview | null; replyLabel?: string; onCancelReply: () => void; onTyping: (active: boolean) => void; onSend: (draft: Draft) => Promise<boolean> };

export function MessageComposer({ userId, replyTo, replyLabel = 'Replying to message', onCancelReply, onTyping, onSend }: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changeText = (value: string) => {
    setText(value);
    onTyping(value.trim().length > 0);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => onTyping(false), 2_400);
  };

  const send = async (media?: { path: string; mimeType: string }) => {
    const clean = text.trim();
    if (!clean && !media) return;
    setSending(true);
    const success = await onSend({ text: clean, mediaPath: media?.path ?? null, mimeType: media?.mimeType ?? null, replyToMessageId: replyTo?.id ?? null });
    setSending(false);
    if (success) {
      setText('');
      onTyping(false);
      onCancelReply();
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission', 'Allow photo access to send an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
    if (result.canceled) return;
    setUploading(true);
    const upload = await uploadMessageImage(userId, result.assets[0].uri);
    setUploading(false);
    if (!upload.success) {
      Alert.alert('Image', 'The image could not be prepared or uploaded. Please try again.');
      return;
    }
    await send(upload.data);
  };

  return <View style={styles.container}>
    {replyTo ? <ReplyPreview reply={replyTo} label={replyLabel} onClear={onCancelReply} /> : null}
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Attach image" onPress={() => { void pickImage(); }} disabled={uploading || sending} style={styles.attach}>
        <Text style={styles.attachText}>＋</Text>
      </Pressable>
      <TextInput value={text} onChangeText={changeText} placeholder="Message" placeholderTextColor={theme.colors.textLight} style={styles.input} multiline maxLength={4000} editable={!uploading && !sending} />
      <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={() => { void send(); }} disabled={uploading || sending || !text.trim()} style={[styles.send, (!text.trim() || uploading || sending) && styles.sendDisabled]}>
        {uploading || sending ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.sendText}>↑</Text>}
      </Pressable>
    </View>
    {uploading ? <Text style={styles.progress}>Preparing and uploading image…</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 7, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.gray, backgroundColor: 'white' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  attach: { height: 42, width: 36, alignItems: 'center', justifyContent: 'center' },
  attachText: { fontSize: 28, color: theme.colors.primaryDark },
  input: { flex: 1, maxHeight: 110, minHeight: 42, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#f4f4f5', borderRadius: theme.radius.xl, color: theme.colors.textDark, fontSize: 15 },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark },
  sendDisabled: { backgroundColor: theme.colors.textLight },
  sendText: { color: 'white', fontSize: 23, lineHeight: 25 },
  progress: { color: theme.colors.textLight, fontSize: 12, marginLeft: 44 },
});

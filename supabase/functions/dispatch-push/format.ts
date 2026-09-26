export type PushContent = { notification_type: string; message_preview: string | null; message_previews: boolean };

const SOCIAL_TYPES = ['like', 'comment', 'reply', 'mention', 'story_mention', 'follow', 'follow_request', 'follow_accepted'];

const LABELS: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  reply: 'replied to your comment',
  mention: 'mentioned you',
  story_mention: 'mentioned you in their story',
  follow: 'started following you',
  follow_request: 'requested to follow you',
  follow_accepted: 'accepted your follow request',
};

export function notificationBody(job: PushContent) {
  if (job.notification_type === 'message') return job.message_previews ? job.message_preview ?? 'New message' : 'New message';
  return LABELS[job.notification_type] ?? 'You have a new notification';
}

export function channelFor(type: string) {
  if (type === 'message') return 'messages';
  return SOCIAL_TYPES.includes(type) ? 'social-activity' : 'general';
}

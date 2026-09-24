import { z } from 'zod';
import { COMMENT_LIMIT, POST_LIMIT, STORY_CAPTION_LIMIT, STORY_IMAGE_SIZE_LIMIT, STORY_VIDEO_MAX_DURATION, STORY_VIDEO_MIN_DURATION, STORY_VIDEO_SIZE_LIMIT, VIDEO_DURATION_LIMIT } from '@/constants';
import { sanitizeHtml, stripHtmlTags } from './common';

export const emailSchema = z.string().trim().toLowerCase().email('invalidEmail').max(254, 'invalidEmail');
export const nameSchema = z.string().trim().min(2, 'invalidName').max(80, 'invalidName');
export const passwordSchema = z.string().min(12, 'invalidPassword').max(128, 'invalidPassword');
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'required') });
export const signupSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });
export const resetSchema = z.object({ password: passwordSchema, confirmation: z.string() }).refine(value => value.password === value.confirmation, { message: 'passwordMismatch', path: ['confirmation'] });
export const commentSchema = z.string().trim().min(1, 'emptyComment').max(COMMENT_LIMIT, 'commentTooLong').refine(value => stripHtmlTags(value).length > 0, 'emptyComment');
export const postBodySchema = z.string().max(20000, 'postTooLong').transform(sanitizeHtml).refine(value => stripHtmlTags(value).length <= POST_LIMIT, 'postTooLong');
export const uuidSchema = z.string().uuid();
export const messageTextSchema = z.string().max(4000, 'messageTooLong').transform(value => stripHtmlTags(value));
export const messageReactionSchema = z.enum(['❤️', '👍', '😂', '😮', '😢', '🔥']);
export const messageInputSchema = z.object({
  clientId: uuidSchema,
  conversationId: uuidSchema,
  text: messageTextSchema.default(''),
  mediaPath: z.string().min(1).max(500).nullable().optional(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']).nullable().optional(),
  replyToMessageId: uuidSchema.nullable().optional(),
}).superRefine((value, context) => {
  if (!value.text && !value.mediaPath) context.addIssue({ code: 'custom', message: 'emptyMessage', path: ['text'] });
  if (value.mediaPath && !value.mimeType) context.addIssue({ code: 'custom', message: 'invalidMedia', path: ['mimeType'] });
});
export const profileSchema = z.object({
  name: nameSchema,
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, 'invalidUsername'),
  bio: z.string().max(500, 'bioTooLong'),
  location: z.string().trim().max(120, 'locationTooLong'),
  phoneNumber: z.string().trim().max(30, 'invalidPhone').refine(value => !value || /^[+\d\s().-]{5,30}$/.test(value), 'invalidPhone'),
  address: z.string().trim().max(300, 'addressTooLong'),
});
export const imageMimeTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
export const videoMimeTypeSchema = z.enum(['video/mp4', 'video/quicktime', 'video/webm']);
export const storyMediaTypeSchema = z.enum(['image', 'video']);
export const storyAudienceSchema = z.enum(['followers', 'close_friends'], { error: 'invalidAudience' });
export const storyCaptionSchema = z.string().trim().max(STORY_CAPTION_LIMIT, 'captionTooLong').transform(value => value || null);
export const storyInputSchema = z.object({
  id: uuidSchema,
  mediaType: storyMediaTypeSchema,
  mediaPath: z.string().min(1).max(500),
  mimeType: z.union([imageMimeTypeSchema, videoMimeTypeSchema]),
  width: z.number().int().min(1).max(16384),
  height: z.number().int().min(1).max(16384),
  duration: z.number().positive().max(VIDEO_DURATION_LIMIT, 'videoTooLong').nullable().optional(),
  thumbnailPath: z.string().min(1).max(500).nullable().optional(),
  caption: storyCaptionSchema.nullable().optional(),
  audience: storyAudienceSchema.default('followers'),
}).superRefine((value, context) => {
  const isImage = imageMimeTypeSchema.safeParse(value.mimeType).success;
  if ((value.mediaType === 'image') !== isImage) context.addIssue({ code: 'custom', message: 'invalidMedia', path: ['mimeType'] });
  if (value.mediaType === 'video' && value.duration == null) context.addIssue({ code: 'custom', message: 'invalidMedia', path: ['duration'] });
  if (value.mediaType === 'image' && value.duration != null) context.addIssue({ code: 'custom', message: 'invalidMedia', path: ['duration'] });
});
export const storyMediaUriSchema = z.string().trim().min(1, 'invalidMedia').max(4096, 'invalidMedia').refine(value => /^(file|content|ph|blob|data):/i.test(value), 'invalidMedia');
export const storyDraftSchema = z.object({
  mediaType: storyMediaTypeSchema,
  uri: storyMediaUriSchema,
  mimeType: z.string(),
  width: z.number().int('invalidMedia').min(1, 'invalidMedia').max(16384, 'invalidMedia'),
  height: z.number().int('invalidMedia').min(1, 'invalidMedia').max(16384, 'invalidMedia'),
  duration: z.number().nullable(),
  fileSize: z.number().int('invalidMedia').nonnegative('invalidMedia').nullable(),
  thumbnailUri: storyMediaUriSchema.nullable(),
}).superRefine((value, context) => {
  if (value.mediaType === 'image') {
    if (!imageMimeTypeSchema.safeParse(value.mimeType).success) context.addIssue({ code: 'custom', message: 'unsupportedMedia', path: ['mimeType'] });
    if (value.duration !== null) context.addIssue({ code: 'custom', message: 'invalidMedia', path: ['duration'] });
    if (value.fileSize !== null && value.fileSize > STORY_IMAGE_SIZE_LIMIT) context.addIssue({ code: 'custom', message: 'mediaTooLarge', path: ['fileSize'] });
    return;
  }
  if (!videoMimeTypeSchema.safeParse(value.mimeType).success) context.addIssue({ code: 'custom', message: 'unsupportedMedia', path: ['mimeType'] });
  if (value.duration === null || !Number.isFinite(value.duration)) context.addIssue({ code: 'custom', message: 'invalidMedia', path: ['duration'] });
  else if (value.duration < STORY_VIDEO_MIN_DURATION) context.addIssue({ code: 'custom', message: 'videoTooShort', path: ['duration'] });
  else if (value.duration > STORY_VIDEO_MAX_DURATION) context.addIssue({ code: 'custom', message: 'videoTooLong', path: ['duration'] });
  if (value.fileSize === null || value.fileSize === 0) context.addIssue({ code: 'custom', message: 'invalidMedia', path: ['fileSize'] });
  else if (value.fileSize > STORY_VIDEO_SIZE_LIMIT) context.addIssue({ code: 'custom', message: 'mediaTooLarge', path: ['fileSize'] });
});
export const storyPublishOptionsSchema = z.object({ caption: storyCaptionSchema, audience: storyAudienceSchema });

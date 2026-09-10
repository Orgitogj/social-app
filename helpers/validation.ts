import { z } from 'zod';
import { COMMENT_LIMIT, POST_LIMIT } from '@/constants';
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

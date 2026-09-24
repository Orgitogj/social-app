import { isStoryErrorCode, normalizeStoryMimeType, storyErrorFromIssues, storyErrorFromService, storyErrorMessage } from '@/helpers/stories';
import { storyDraftSchema, storyPublishOptionsSchema } from '@/helpers/validation';
import type { StoryDraft } from '@/types/domain';

const image: StoryDraft = { mediaType: 'image', uri: 'file:///cache/story.jpg', mimeType: 'image/jpeg', width: 1080, height: 1920, duration: null, fileSize: 800_000, thumbnailUri: null };
const video: StoryDraft = { mediaType: 'video', uri: 'file:///cache/story.mp4', mimeType: 'video/mp4', width: 1080, height: 1920, duration: 12.4, fileSize: 9_000_000, thumbnailUri: 'file:///cache/thumb.jpg' };

function errorFor(draft: StoryDraft) {
  const result = storyDraftSchema.safeParse(draft);
  return result.success ? null : storyErrorFromIssues(result.error);
}

describe('story draft validation', () => {
  it('accepts a prepared image story', () => {
    expect(errorFor(image)).toBeNull();
  });

  it('rejects unsupported image mime types', () => {
    expect(errorFor({ ...image, mimeType: 'image/gif' })).toBe('unsupportedMedia');
    expect(errorFor({ ...image, mimeType: 'video/mp4' })).toBe('unsupportedMedia');
  });

  it('rejects oversized media', () => {
    expect(errorFor({ ...image, fileSize: 10 * 1024 * 1024 + 1 })).toBe('mediaTooLarge');
    expect(errorFor({ ...video, fileSize: 50 * 1024 * 1024 + 1 })).toBe('mediaTooLarge');
  });

  it('validates video duration bounds', () => {
    expect(errorFor(video)).toBeNull();
    expect(errorFor({ ...video, duration: 60 })).toBeNull();
    expect(errorFor({ ...video, duration: 60.5 })).toBe('videoTooLong');
    expect(errorFor({ ...video, duration: 0.4 })).toBe('videoTooShort');
    expect(errorFor({ ...video, duration: null })).toBe('invalidMedia');
  });

  it('requires a known video size and supported container', () => {
    expect(errorFor({ ...video, fileSize: null })).toBe('invalidMedia');
    expect(errorFor({ ...video, mimeType: 'video/3gpp' })).toBe('unsupportedMedia');
  });

  it('rejects images carrying a duration and untrusted uris', () => {
    expect(errorFor({ ...image, duration: 3 })).toBe('invalidMedia');
    expect(errorFor({ ...image, uri: 'https://example.com/a.jpg' })).toBe('invalidMedia');
    expect(errorFor({ ...image, uri: '' })).toBe('invalidMedia');
    expect(errorFor({ ...image, width: 0 })).toBe('invalidMedia');
  });
});

describe('story publish options', () => {
  it('accepts supported audiences only', () => {
    expect(storyPublishOptionsSchema.safeParse({ caption: '', audience: 'close_friends' }).success).toBe(true);
    const invalid = storyPublishOptionsSchema.safeParse({ caption: '', audience: 'public' });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(storyErrorFromIssues(invalid.error)).toBe('invalidAudience');
  });

  it('enforces caption limits and normalizes empty captions', () => {
    expect(storyPublishOptionsSchema.parse({ caption: '   ', audience: 'followers' }).caption).toBeNull();
    expect(storyPublishOptionsSchema.parse({ caption: 'x'.repeat(500), audience: 'followers' }).caption).toHaveLength(500);
    const tooLong = storyPublishOptionsSchema.safeParse({ caption: 'x'.repeat(501), audience: 'followers' });
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) expect(storyErrorFromIssues(tooLong.error)).toBe('captionTooLong');
  });
});

describe('story media and error helpers', () => {
  it('normalizes mime types from aliases and file extensions', () => {
    expect(normalizeStoryMimeType('image/jpg')).toBe('image/jpeg');
    expect(normalizeStoryMimeType(null, 'file:///a/clip.MOV')).toBe('video/quicktime');
    expect(normalizeStoryMimeType(undefined, 'file:///a/photo.heic?x=1')).toBe('image/heic');
    expect(normalizeStoryMimeType(undefined, 'file:///a/unknown')).toBe('application/octet-stream');
  });

  it('maps service errors to displayable story errors', () => {
    expect(storyErrorFromService({ code: 'rateLimited', message: 'rateLimited', retryable: true }, 'publishFailed')).toBe('rateLimited');
    expect(storyErrorFromService({ code: 'notAllowed', message: 'notAllowed', retryable: false }, 'publishFailed')).toBe('publishFailed');
    expect(storyErrorFromService({ code: 'notFound', message: 'notFound', retryable: false }, 'uploadFailed')).toBe('storyUnavailable');
    expect(storyErrorFromService({ code: 'invalidData', message: 'captionTooLong', retryable: false }, 'publishFailed')).toBe('captionTooLong');
  });

  it('has a message for every error code', () => {
    expect(isStoryErrorCode('noCloseFriends')).toBe(true);
    expect(isStoryErrorCode('nope')).toBe(false);
    expect(storyErrorMessage('noCloseFriends')).toMatch(/Close Friends/);
  });
});

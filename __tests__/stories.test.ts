import { STORY_SIGNED_URL_TTL_SECONDS, storyMediaPath, storySignedUrlTtl, storyThumbnailPath } from '@/helpers/stories';
import { storyAudienceSchema, storyCaptionSchema, storyInputSchema } from '@/helpers/validation';

const mockInsert = jest.fn();
const mockCreateSignedUrl = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ insert: mockInsert }),
    storage: { from: () => ({ createSignedUrl: mockCreateSignedUrl }) },
  },
}));
jest.mock('@/services/imageService', () => ({ uploadFileWithProgress: jest.fn() }));

// eslint-disable-next-line import/first
import { addCloseFriend, parseCloseFriend, parseCloseFriendCandidate } from '@/services/closeFriendsService';
// eslint-disable-next-line import/first
import { getStoryMediaUrl, parseStory } from '@/services/storyService';

const userId = 'a49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const friendId = 'b49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const storyId = 'c49d3be3-82e9-4a96-ae64-a868d7ddc2a4';
const imageStory = { id: storyId, mediaType: 'image', mediaPath: `${userId}/stories/${storyId}/media.jpg`, mimeType: 'image/jpeg', width: 1080, height: 1920 } as const;

describe('story storage paths and signed urls', () => {
  it('builds paths inside the author and story namespace', () => {
    expect(storyMediaPath(userId, storyId, 'video/quicktime')).toBe(`${userId}/stories/${storyId}/media.mov`);
    expect(storyMediaPath(userId, storyId, 'image/jpeg')).toBe(`${userId}/stories/${storyId}/media.jpg`);
    expect(storyThumbnailPath(userId, storyId, 'image/webp')).toBe(`${userId}/stories/${storyId}/thumbnail.webp`);
  });

  it('never signs a url past the story expiry', () => {
    const now = Date.parse('2026-09-23T12:00:00.000Z');
    expect(storySignedUrlTtl('2026-09-24T12:00:00.000Z', now)).toBe(STORY_SIGNED_URL_TTL_SECONDS);
    expect(storySignedUrlTtl('2026-09-23T12:01:00.000Z', now)).toBe(60);
    expect(storySignedUrlTtl('2026-09-23T11:59:59.000Z', now)).toBeNull();
    expect(storySignedUrlTtl('not-a-date', now)).toBeNull();
  });

  it('does not request a signed url for an expired story', async () => {
    const result = await getStoryMediaUrl(`${userId}/stories/${storyId}/media.jpg`, '2000-01-01T00:00:00.000Z');
    expect(result.success).toBe(false);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });
});

describe('story validation', () => {
  it('accepts supported audiences only', () => {
    expect(storyAudienceSchema.safeParse('close_friends').success).toBe(true);
    expect(storyAudienceSchema.safeParse('public').success).toBe(false);
  });

  it('defaults the audience and normalizes captions', () => {
    const parsed = storyInputSchema.parse({ ...imageStory, caption: '  Hello\nthere  ' });
    expect(parsed.audience).toBe('followers');
    expect(parsed.caption).toBe('Hello\nthere');
    expect(storyCaptionSchema.parse('   ')).toBeNull();
    expect(storyCaptionSchema.safeParse('x'.repeat(501)).success).toBe(false);
  });

  it('requires media type, mime type, and duration to agree', () => {
    expect(storyInputSchema.safeParse({ ...imageStory, mimeType: 'video/mp4' }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...imageStory, duration: 5 }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...imageStory, mediaType: 'video', mimeType: 'video/mp4' }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...imageStory, mediaType: 'video', mimeType: 'video/mp4', duration: 61 }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...imageStory, mediaType: 'video', mimeType: 'video/mp4', duration: 12.5 }).success).toBe(true);
  });
});

describe('story and close friends responses', () => {
  it('parses story documents and rejects unknown audiences', () => {
    const document = { id: storyId, author_id: userId, media_type: 'image', media_path: imageStory.mediaPath, mime_type: 'image/jpeg', width: 1080, height: 1920, duration: null, caption: null, audience: 'close_friends', created_at: '2026-09-23T12:00:00Z', expires_at: '2026-09-24T12:00:00Z', author: { id: userId, name: 'Ava', username: 'ava', image: null } };
    expect(parseStory(document)).toMatchObject({ id: storyId, audience: 'close_friends', author: { name: 'Ava' } });
    expect(parseStory({ ...document, audience: 'everyone' })).toBeNull();
  });

  it('parses close friends rows and candidates', () => {
    expect(parseCloseFriend({ id: storyId, friend_id: friendId, created_at: '2026-09-23T12:00:00Z', user: { id: friendId, name: 'Finn' } })?.user.name).toBe('Finn');
    expect(parseCloseFriend({ id: storyId, friend_id: friendId })).toBeNull();
    expect(parseCloseFriendCandidate({ id: friendId, name: 'Finn', is_close_friend: true })?.is_close_friend).toBe(true);
  });

  it('treats an existing membership as success and validates ids', async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: '23505' } });
    await expect(addCloseFriend(userId, friendId)).resolves.toEqual({ success: true, data: undefined });
    mockInsert.mockResolvedValueOnce({ error: { code: '42501' } });
    await expect(addCloseFriend(userId, friendId)).resolves.toMatchObject({ success: false, error: { code: 'notAllowed' } });
    await expect(addCloseFriend(userId, 'not-a-uuid')).resolves.toMatchObject({ success: false, error: { code: 'invalidData' } });
  });
});

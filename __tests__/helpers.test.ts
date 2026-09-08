import { extractHashtags, extractMentions, normalizeSearch, stripHtmlTags } from '@/helpers/common';
import { deduplicate, mergeRealtime, MutationLock, pageFrom } from '@/helpers/pagination';
import { commentSchema, emailSchema, signupSchema } from '@/helpers/validation';

describe('validation and helpers', () => {
  it('normalizes email and rejects weak passwords', () => { expect(emailSchema.parse('  USER@EXAMPLE.COM ')).toBe('user@example.com'); expect(signupSchema.safeParse({ name: 'A', email: 'bad', password: 'short' }).success).toBe(false); });
  it('sanitizes visually empty rich text', () => { expect(stripHtmlTags('<p><br></p>')).toBe(''); expect(commentSchema.safeParse('\u200b<br>').success).toBe(false); });
  it('extracts normalized tags and mentions', () => { expect(extractHashtags('<p>#Expo #expo #LinkUp</p>')).toEqual(['expo', 'linkup']); expect(extractMentions('@User and @user')).toEqual(['user']); expect(normalizeSearch('  ÀBC ')).toBe('àbc'); });
  it('deduplicates cursor pages and locks mutations', () => { const a = { id: 'a', created_at: '2026-01-02' }; const b = { id: 'b', created_at: '2026-01-01' }; expect(deduplicate([a, a, b])).toHaveLength(2); expect(pageFrom([a, b], 2).nextCursor).toEqual({ id: 'b', created_at: '2026-01-01' }); expect(mergeRealtime(pageFrom([b], 1), a).items[0]).toEqual(a); const lock = new MutationLock(); expect(lock.acquire('like:a')).toBe(true); expect(lock.acquire('like:a')).toBe(false); lock.release('like:a'); expect(lock.acquire('like:a')).toBe(true); });
});

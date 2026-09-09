import { supabase } from '@/lib/supabase';
import type { Comment, Post } from '@/types/domain';
import type { ServiceResult } from '@/types/result';

export async function fetchPosts(limit = 20, userId?: string, _offset = 0): Promise<ServiceResult<Post[]>> {
  const { data, error } = await supabase.rpc('get_feed', { p_mode: userId ? 'all' : 'all', p_user_id: userId ?? null, p_limit: limit });
  return error ? { success: false, error: { code: 'networkError', message: 'Could not fetch posts', retryable: true } } : { success: true, data: (data ?? []) as Post[] };
}
export async function fetchPostDetails(postId: string): Promise<ServiceResult<Post & { comments: Comment[] }>> { const { data, error } = await supabase.rpc('get_post', { p_id: postId }).single(); return error ? { success: false, error: { code: 'notFound', message: 'Post unavailable', retryable: false } } : { success: true, data: { ...(data as Post), comments: [] } }; }
export async function createComment(comment: { postId: string; userId: string; text: string; parentId?: string | null }) { return supabase.from('comments').insert(comment).select().single(); }
export async function removeComment(commentId: string) { return supabase.from('comments').delete().eq('id', commentId); }
export async function removePost(postId: string) { return supabase.from('posts').delete().eq('id', postId); }
export async function createPostLike(postLike: { postId: string; userId: string }) { return supabase.from('postLikes').insert(postLike).select().single(); }
export async function removePostLike(postId: string, userId: string) { return supabase.from('postLikes').delete().eq('postId', postId).eq('userId', userId); }
export async function createOrUpdatePost(post: { id?: string; body: string; userId: string; visibility?: string; status?: string; file?: unknown }) { const fn = post.id ? 'update_post' : 'create_post'; const { data, error } = await supabase.rpc(fn, { p_id: post.id ?? crypto.randomUUID(), p_body: post.body, p_visibility: post.visibility ?? 'public', p_status: post.status ?? 'published', p_media: [] }); return error ? { success: false, msg: 'Could not save post' } : { success: true, data }; }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async request => {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const payload = await request.json().catch(() => ({}));
  if (payload.action === 'export') {
    const [profile, privateProfile, posts, comments, follows, bookmarks, notifications, conversations, messages, messageReactions, hiddenMessages, preferences, reports] = await Promise.all([
      service.from('users').select('id,name,username,image,bio,location,is_private,created_at,updated_at').eq('id', user.id).maybeSingle(),
      service.from('user_private').select('id,phoneNumber,address,language,allow_messages,created_at,updated_at').eq('id', user.id).maybeSingle(),
      service.from('posts').select('*').eq('userId', user.id),
      service.from('comments').select('*').eq('userId', user.id),
      service.from('follows').select('*').or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
      service.from('bookmarks').select('*').eq('userId', user.id),
      service.from('notifications').select('*').eq('receiverId', user.id),
      service.from('conversation_members').select('conversation_id').eq('userId', user.id),
      service.from('messages').select('*').eq('userId', user.id),
      service.from('message_reactions').select('*').eq('userId', user.id),
      service.from('message_hidden_for_users').select('*').eq('userId', user.id),
      service.from('notification_preferences').select('*').eq('userId', user.id).maybeSingle(),
      service.from('reports').select('*').eq('reporter_id', user.id),
    ]);
    return new Response(JSON.stringify({ exported_at: new Date().toISOString(), auth_user: { id: user.id, email: user.email, created_at: user.created_at }, profile: profile.data, private_profile: privateProfile.data, posts: posts.data, comments: comments.data, follows: follows.data, bookmarks: bookmarks.data, notifications: notifications.data, conversations: conversations.data, messages: messages.data, message_reactions: messageReactions.data, hidden_messages: hiddenMessages.data, notification_preferences: preferences.data, reports: reports.data }), { headers: { 'content-type': 'application/json' } });
  }
  if (payload.action === 'delete') {
    const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
    if (deleteError) return new Response(JSON.stringify({ error: 'Account deletion failed' }), { status: 500 });
    return new Response(JSON.stringify({ deleted: true }), { headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
});

create function public.post_document(p public.posts) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'userId', p."userId", 'body', p.body, 'visibility', p.visibility, 'status', p.status, 'created_at', p.created_at, 'updated_at', p.updated_at,
    'user', (select jsonb_build_object('id', id, 'name', name, 'username', username, 'image', image) from public.users where id = p."userId"),
    'media', coalesce((select jsonb_agg(to_jsonb(m) order by sort_order) from public.post_media m where "postId" = p.id), '[]'::jsonb),
    'like_count', (select count(*) from public."postLikes" where "postId" = p.id),
    'comment_count', (select count(*) from public.comments where "postId" = p.id),
    'liked', exists(select 1 from public."postLikes" where "postId" = p.id and "userId" = auth.uid()),
    'reaction', (select reaction from public."postLikes" where "postId" = p.id and "userId" = auth.uid()),
    'bookmarked', exists(select 1 from public.bookmarks where "postId" = p.id and "userId" = auth.uid())
  );
$$;

create function public.get_feed(p_mode text default 'all', p_user_id uuid default null, p_query text default '', p_hashtag text default '', p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 20) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select public.post_document(p) from public.posts p
  where (p_user_id is null or p."userId" = p_user_id)
    and (p_before_time is null or (p.created_at, p.id) < (p_before_time, p_before_id))
    and case p_mode
      when 'drafts' then p."userId" = auth.uid() and p.status = 'draft'
      when 'following' then p.status = 'published' and (p."userId" = auth.uid() or private.follows(auth.uid(), p."userId"))
      when 'explore' then p.status = 'published' and p."userId" <> auth.uid() and p.visibility = 'public' and exists(select 1 from public.users u where u.id = p."userId" and not u.is_private)
      when 'saved' then p.status = 'published' and exists(select 1 from public.bookmarks where "postId" = p.id and "userId" = auth.uid())
      when 'all' then p.status = 'published'
      else false end
    and (p_query = '' or p.search_document @@ websearch_to_tsquery('simple', left(p_query, 100)))
    and (p_hashtag = '' or exists(select 1 from public.post_hashtags ph join public.hashtags h on h.id = ph.hashtag_id where ph."postId" = p.id and h.name = lower(p_hashtag)))
    and (p_user_id is not null or not exists(select 1 from public.mutes where "userId" = auth.uid() and muted_id = p."userId"))
  order by p.created_at desc, p.id desc limit greatest(1, least(p_limit, 50));
$$;

create function public.get_post(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select public.post_document(p) from public.posts p where id = p_id;
$$;

create function public.get_comments(p_post_id uuid, p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 30) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(c) || jsonb_build_object(
    'user', (select jsonb_build_object('id', id, 'name', name, 'username', username, 'image', image) from public.users where id = c."userId"),
    'like_count', (select count(*) from public.comment_likes where "commentId" = c.id),
    'liked', exists(select 1 from public.comment_likes where "commentId" = c.id and "userId" = auth.uid()),
    'parent_text', (select left(text, 120) from public.comments where id = c."parentId")
  ) from public.comments c where "postId" = p_post_id
    and (p_before_time is null or (c.created_at, c.id) < (p_before_time, p_before_id))
  order by c.created_at desc, c.id desc limit greatest(1, least(p_limit, 50));
$$;

create function public.get_profile(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(u) || jsonb_build_object(
    'follower_count', (select count(*) from public.follows where following_id = u.id and status = 'accepted'),
    'following_count', (select count(*) from public.follows where follower_id = u.id and status = 'accepted'),
    'follow', (select jsonb_build_object('id', id, 'status', status) from public.follows where follower_id = auth.uid() and following_id = u.id),
    'muted', exists(select 1 from public.mutes where "userId" = auth.uid() and muted_id = u.id)
  ) from public.users u where id = p_id;
$$;

create index users_name_prefix on public.users (lower(name) text_pattern_ops);

create function public.search_users(p_query text default '', p_after_id uuid default null, p_limit integer default 20, p_suggestions boolean default false) returns setof public.users
language sql stable security invoker set search_path = '' as $$
  select u.* from public.users u where u.id <> auth.uid() and (p_after_id is null or u.id > p_after_id)
    and (p_suggestions or char_length(btrim(p_query)) >= 2)
    and (p_suggestions or lower(u.name) like replace(replace(lower(btrim(left(p_query, 100))), '%', '\%'), '_', '\_') || '%' or u.username like replace(replace(lower(btrim(left(p_query, 100))), '%', '\%'), '_', '\_') || '%')
    and (not p_suggestions or not exists(select 1 from public.follows where follower_id = auth.uid() and following_id = u.id))
  order by u.id limit greatest(1, least(p_limit, 50));
$$;

create function public.search_hashtags(p_query text default '', p_after_name text default '', p_limit integer default 20) returns table(id uuid, name text, post_count bigint)
language sql stable security invoker set search_path = '' as $$
  select h.id, h.name, count(*) from public.hashtags h join public.post_hashtags ph on ph.hashtag_id = h.id
  where h.name like replace(replace(lower(left(p_query, 50)), '%', '\%'), '_', '\_') || '%' and h.name > p_after_name
  group by h.id, h.name order by h.name limit greatest(1, least(p_limit, 50));
$$;

create function public.trending_hashtags() returns table(id uuid, name text, post_count bigint)
language sql stable security invoker set search_path = '' as $$
  select h.id, h.name, count(*) from public.hashtags h join public.post_hashtags ph on ph.hashtag_id = h.id join public.posts p on p.id = ph."postId"
  where p.created_at > now() - interval '7 days' and p.status = 'published' and p.visibility = 'public'
  group by h.id, h.name order by count(*) desc, h.name limit 20;
$$;

create function public.get_notifications(p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 20) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(n) || jsonb_build_object('sender', (select jsonb_build_object('id', id, 'name', name, 'username', username, 'image', image) from public.users where id = n."senderId"))
  from public.notifications n where "receiverId" = auth.uid() and (p_before_time is null or (n.created_at, n.id) < (p_before_time, p_before_id))
  order by n.created_at desc, n.id desc limit greatest(1, least(p_limit, 50));
$$;

create function public.get_conversations(p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 20) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(c) || jsonb_build_object(
    'other_user', (select jsonb_build_object('id', id, 'name', name, 'username', username, 'image', image) from public.users where id = case when c.user_low = auth.uid() then c.user_high else c.user_low end),
    'latest_message', (select to_jsonb(m) from public.messages m where conversation_id = c.id order by created_at desc, id desc limit 1),
    'unread_count', (select count(*) from public.messages m where conversation_id = c.id and "userId" <> auth.uid() and created_at > coalesce((select last_read_at from public.conversation_members where conversation_id = c.id and "userId" = auth.uid()), '-infinity'::timestamptz))
  ) from public.conversations c where p_before_time is null or (c.updated_at, c.id) < (p_before_time, p_before_id)
  order by c.updated_at desc, c.id desc limit greatest(1, least(p_limit, 50));
$$;

create function public.message_unread_count() returns bigint
language sql stable security invoker set search_path = '' as $$
  select count(*) from public.messages m join public.conversation_members cm on cm.conversation_id = m.conversation_id and cm."userId" = auth.uid()
  where m."userId" <> auth.uid() and m.created_at > coalesce(cm.last_read_at, '-infinity'::timestamptz);
$$;

create function public.get_relationships(p_id uuid, p_kind text, p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 20) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(f) || jsonb_build_object('user', (select jsonb_build_object('id', id, 'name', name, 'username', username, 'image', image) from public.users where id = case when p_kind = 'following' then f.following_id else f.follower_id end))
  from public.follows f where case p_kind when 'following' then f.follower_id = p_id and status = 'accepted' when 'followers' then f.following_id = p_id and status = 'accepted' when 'requests' then f.following_id = auth.uid() and p_id = auth.uid() and status = 'pending' else false end
    and (p_before_time is null or (f.created_at, f.id) < (p_before_time, p_before_id))
  order by f.created_at desc, f.id desc limit greatest(1, least(p_limit, 50));
$$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('post_document', 'get_feed', 'get_post', 'get_comments', 'get_profile', 'search_users', 'search_hashtags', 'trending_hashtags', 'get_notifications', 'get_conversations', 'message_unread_count', 'get_relationships') loop
    execute format('revoke execute on function %s from public, anon', f.signature);
    execute format('grant execute on function %s to authenticated', f.signature);
  end loop;
end;
$$;

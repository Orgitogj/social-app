alter table public.mutes
  add column posts boolean not null default true,
  add column stories boolean not null default false,
  add constraint mutes_scope check (posts or stories);

create or replace function public.get_feed(p_mode text default 'all', p_user_id uuid default null, p_query text default '', p_hashtag text default '', p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 20) returns setof jsonb
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
    and (p_user_id is not null or not exists(select 1 from public.mutes where "userId" = auth.uid() and muted_id = p."userId" and posts))
  order by p.created_at desc, p.id desc limit greatest(1, least(p_limit, 50));
$$;

create or replace function public.get_profile(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(u) || jsonb_build_object(
    'follower_count', (select count(*) from public.follows where following_id = u.id and status = 'accepted'),
    'following_count', (select count(*) from public.follows where follower_id = u.id and status = 'accepted'),
    'follow', (select jsonb_build_object('id', id, 'status', status) from public.follows where follower_id = auth.uid() and following_id = u.id),
    'muted', exists(select 1 from public.mutes where "userId" = auth.uid() and muted_id = u.id and posts),
    'stories_muted', exists(select 1 from public.mutes where "userId" = auth.uid() and muted_id = u.id and stories)
  ) from public.users u where id = p_id;
$$;

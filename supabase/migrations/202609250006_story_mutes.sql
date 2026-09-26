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

create function public.set_story_mute(p_user_id uuid, p_muted boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_user_id is null or p_user_id = auth.uid() or not exists(select 1 from public.users where id = p_user_id) then
    raise exception 'User is unavailable' using errcode = '42501';
  end if;
  if p_muted then
    insert into public.mutes("userId", muted_id, posts, stories) values (auth.uid(), p_user_id, false, true)
    on conflict ("userId", muted_id) do update set stories = true;
  else
    update public.mutes set stories = false where "userId" = auth.uid() and muted_id = p_user_id and posts;
    delete from public.mutes where "userId" = auth.uid() and muted_id = p_user_id and not posts;
  end if;
  return p_muted;
end;
$$;

revoke execute on function public.set_story_mute(uuid, boolean) from public, anon;
grant execute on function public.set_story_mute(uuid, boolean) to authenticated;

create or replace function public.get_story_tray(p_limit integer default 50) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  with authors as (
    select auth.uid() as id
    union
    select f.following_id from public.follows f where f.follower_id = auth.uid() and f.status = 'accepted'
  ), active as (
    select s.author_id, s.audience, s.created_at, s.expires_at,
      s.author_id <> auth.uid() and not exists(select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()) as unviewed
    from authors a join public.stories s on s.author_id = a.id and s.expires_at > now()
  ), grouped as (
    select author_id, count(*) as story_count, count(*) filter (where unviewed) as unviewed_count,
      max(created_at) as latest_story_at, min(expires_at) as next_expires_at, bool_or(audience = 'close_friends') as has_close_friends
    from active group by author_id
  ), summarized as (
    select g.*, g.author_id <> auth.uid() and exists(select 1 from public.mutes m where m."userId" = auth.uid() and m.muted_id = g.author_id and m.stories) as muted
    from grouped g
  )
  select jsonb_build_object(
    'author', jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'image', u.image),
    'story_count', s.story_count, 'unviewed_count', s.unviewed_count, 'latest_story_at', s.latest_story_at,
    'next_expires_at', s.next_expires_at, 'has_close_friends', s.has_close_friends, 'is_own', s.author_id = auth.uid(), 'muted', s.muted)
  from summarized s join public.users u on u.id = s.author_id
  where auth.uid() is not null
  order by s.author_id = auth.uid() desc, s.muted, s.unviewed_count > 0 desc, s.latest_story_at desc, s.author_id
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

create or replace function private.index_story_mentions() returns trigger
language plpgsql security definer set search_path = '' as $$
declare token text; target uuid;
begin
  if tg_op = 'UPDATE' then
    if new.caption is not distinct from old.caption then return new; end if;
    delete from public.story_mentions where story_id = new.id;
  end if;
  for token in select private.extract_mentions(new.caption) loop
    select id into target from public.users where username = token;
    if target is not null and target <> new.author_id and not private.blocked(new.author_id, target) then
      insert into public.story_mentions(story_id, user_id) values (new.id, target) on conflict do nothing;
      if private.story_visible_to(new.id, target)
        and not exists(select 1 from public.mutes where "userId" = target and muted_id = new.author_id and stories) then
        perform private.emit_notification(new.author_id, target, 'story_mention', jsonb_build_object('storyId', new.id, 'userId', new.author_id), 'story_mention:' || new.id || ':' || target);
      end if;
    end if;
  end loop;
  return new;
end;
$$;

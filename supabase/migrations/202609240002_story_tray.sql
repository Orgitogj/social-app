create or replace function public.get_active_stories(p_author_id uuid) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select public.story_document(s) || jsonb_build_object('viewed',
    s.author_id = auth.uid() or exists(select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()))
  from public.stories s
  where s.author_id = p_author_id and s.expires_at > now()
  order by s.expires_at, s.id limit 100;
$$;

create function public.get_story_tray(p_limit integer default 50) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  with authors as (
    select auth.uid() as id
    union
    select f.following_id from public.follows f where f.follower_id = auth.uid() and f.status = 'accepted'
  ), active as (
    select s.author_id, s.audience, s.created_at,
      s.author_id <> auth.uid() and not exists(select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()) as unviewed
    from authors a join public.stories s on s.author_id = a.id and s.expires_at > now()
  ), grouped as (
    select author_id, count(*) as story_count, count(*) filter (where unviewed) as unviewed_count,
      max(created_at) as latest_story_at, bool_or(audience = 'close_friends') as has_close_friends
    from active group by author_id
  )
  select jsonb_build_object(
    'author', jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'image', u.image),
    'story_count', g.story_count, 'unviewed_count', g.unviewed_count, 'latest_story_at', g.latest_story_at,
    'has_close_friends', g.has_close_friends, 'is_own', g.author_id = auth.uid())
  from grouped g join public.users u on u.id = g.author_id
  where auth.uid() is not null
  order by g.author_id = auth.uid() desc, g.unviewed_count > 0 desc, g.latest_story_at desc, g.author_id
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke execute on function public.get_story_tray(integer) from public, anon;
grant execute on function public.get_story_tray(integer) to authenticated;

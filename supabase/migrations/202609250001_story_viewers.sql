create policy story_views_read_author on public.story_views for select to authenticated using (
  exists(select 1 from public.stories s where s.id = story_id and s.author_id = (select auth.uid()))
);

create index story_views_story_recent on public.story_views (story_id, viewed_at desc, viewer_id desc);

create function public.get_story_viewers(p_story_id uuid, p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 30) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('viewer', jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'image', u.image), 'viewed_at', v.viewed_at)
  from public.story_views v
  join public.users u on u.id = v.viewer_id
  where v.story_id = p_story_id
    and exists(select 1 from public.stories s where s.id = p_story_id and s.author_id = auth.uid())
    and (p_before_time is null or (v.viewed_at, v.viewer_id) < (p_before_time, p_before_id))
  order by v.viewed_at desc, v.viewer_id desc
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$$;

revoke execute on function public.get_story_viewers(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_story_viewers(uuid, timestamptz, uuid, integer) to authenticated;

create or replace function public.get_active_stories(p_author_id uuid) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select public.story_document(s) || jsonb_build_object(
    'viewed', s.author_id = auth.uid() or exists(select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()),
    'view_count', case when s.author_id = auth.uid() then (select count(*) from public.story_views v where v.story_id = s.id) end)
  from public.stories s
  where s.author_id = p_author_id and s.expires_at > now()
  order by s.expires_at, s.id limit 100;
$$;

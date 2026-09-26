create function private.story_visible_authors() returns setof uuid
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id)
  select f.following_id from me
  join public.follows f on f.follower_id = me.id and f.status = 'accepted'
  where not exists(
    select 1 from public.blocks b
    where (b.blocker_id = me.id and b.blocked_id = f.following_id) or (b.blocker_id = f.following_id and b.blocked_id = me.id)
  );
$$;

create function private.story_close_friend_owners() returns setof uuid
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id)
  select cf.owner_id from me
  join public.close_friends cf on cf.friend_id = me.id
  where exists(select 1 from public.stories s where s.author_id = cf.owner_id and s.audience = 'close_friends' and s.expires_at > now());
$$;

revoke execute on function private.story_visible_authors(), private.story_close_friend_owners() from public, anon;
grant execute on function private.story_visible_authors(), private.story_close_friend_owners() to authenticated;

alter policy stories_read on public.stories using (
  author_id = (select auth.uid())
  or (
    expires_at > now()
    and author_id in (select private.story_visible_authors())
    and (audience = 'followers' or author_id in (select private.story_close_friend_owners()))
  )
);

create or replace function public.get_story_tray(p_limit integer default 50) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  with me as (select auth.uid() as id), authors as (
    select me.id from me where me.id is not null
    union
    select f.following_id from me join public.follows f on f.follower_id = me.id and f.status = 'accepted'
  ), active as (
    select s.author_id, s.audience, s.created_at, s.expires_at,
      s.author_id <> me.id and not exists(select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = me.id) as unviewed
    from me
    cross join authors a
    cross join lateral (select st.* from public.stories st where st.author_id = a.id and st.expires_at > now()) s
  ), grouped as (
    select author_id, count(*) as story_count, count(*) filter (where unviewed) as unviewed_count,
      max(created_at) as latest_story_at, min(expires_at) as next_expires_at, bool_or(audience = 'close_friends') as has_close_friends
    from active group by author_id
  ), summarized as (
    select g.*, g.author_id <> me.id and exists(select 1 from public.mutes m where m."userId" = me.id and m.muted_id = g.author_id and m.stories) as muted
    from grouped g cross join me
  )
  select jsonb_build_object(
    'author', jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'image', u.image),
    'story_count', s.story_count, 'unviewed_count', s.unviewed_count, 'latest_story_at', s.latest_story_at,
    'next_expires_at', s.next_expires_at, 'has_close_friends', s.has_close_friends, 'is_own', s.author_id = me.id, 'muted', s.muted)
  from summarized s cross join me join public.users u on u.id = s.author_id
  order by s.author_id = me.id desc, s.muted, s.unviewed_count > 0 desc, s.latest_story_at desc, s.author_id
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

create table private.cleanup_cursors (
  name text primary key,
  position text not null default '',
  updated_at timestamptz not null default now()
);

drop function private.queue_orphan_story_media(integer);

create function private.queue_orphan_story_media(p_scan integer default 25000) returns integer
language plpgsql security definer set search_path = '' as $$
declare start_after text; scan_size integer := greatest(100, least(coalesce(p_scan, 25000), 50000)); scanned integer; last_name text; queued integer;
begin
  insert into private.cleanup_cursors(name) values ('orphan_story_media') on conflict do nothing;
  select position into start_after from private.cleanup_cursors where name = 'orphan_story_media' for update;
  with scanned_objects as materialized (
    select o.name, o.created_at from storage.objects o
    where o.bucket_id = 'uploads' and o.name > start_after
    order by o.bucket_id, o.name
    limit scan_size
  ), inserted as (
    insert into private.storage_cleanup(path)
    select c.name from scanned_objects c
    where c.name ~ '^[0-9a-f-]{36}/stories/[0-9a-f-]{36}/(media|thumbnail)\.[a-z0-9]+$'
      and c.created_at < now() - interval '24 hours'
      and not exists(select 1 from public.stories s where s.media_path = c.name)
      and not exists(select 1 from public.stories s where s.thumbnail_path = c.name)
    on conflict do nothing
    returning 1
  )
  select (select count(*) from scanned_objects), (select max(name) from scanned_objects), (select count(*) from inserted)
  into scanned, last_name, queued;
  update private.cleanup_cursors
  set position = case when scanned < scan_size then '' else coalesce(last_name, '') end, updated_at = now()
  where name = 'orphan_story_media';
  return queued;
end;
$$;

revoke execute on function private.queue_orphan_story_media(integer) from public, anon, authenticated;

create or replace function private.run_story_cleanup() returns void
language plpgsql security definer set search_path = '' as $$
declare batch integer := 500; purged integer; rounds integer := 0;
begin
  loop
    purged := private.purge_expired_stories(batch);
    rounds := rounds + 1;
    exit when purged < batch or rounds >= 20;
  end loop;
  perform private.queue_orphan_story_media();
end;
$$;

revoke execute on function private.run_story_cleanup() from public, anon, authenticated;

select cron.schedule(
  'linkup-storage-cleanup',
  '*/5 * * * *',
  $cron$select private.invoke_storage_cleanup();$cron$
);

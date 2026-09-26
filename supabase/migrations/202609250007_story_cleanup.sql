create index stories_expires on public.stories (expires_at);
create index notifications_story_mention on public.notifications ((data->>'storyId')) where type = 'story_mention';

create or replace function private.queue_story_media_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.storage_cleanup(path) values (old.media_path) on conflict do nothing;
  if old.thumbnail_path is not null then insert into private.storage_cleanup(path) values (old.thumbnail_path) on conflict do nothing; end if;
  delete from public.notifications where type = 'story_mention' and data->>'storyId' = old.id::text;
  return old;
end;
$$;

create function private.purge_expired_stories(p_limit integer default 500) returns integer
language plpgsql security definer set search_path = '' as $$
declare purged integer;
begin
  with expired as (
    select id from public.stories
    where expires_at < now() - interval '48 hours'
    order by expires_at limit greatest(1, least(coalesce(p_limit, 500), 1000))
  )
  delete from public.stories s using expired where s.id = expired.id;
  get diagnostics purged = row_count;
  return purged;
end;
$$;

create function private.queue_orphan_story_media(p_limit integer default 500) returns integer
language plpgsql security definer set search_path = '' as $$
declare queued integer;
begin
  insert into private.storage_cleanup(path)
  select o.name from storage.objects o
  where o.bucket_id = 'uploads'
    and o.name ~ '^[0-9a-f-]{36}/stories/[0-9a-f-]{36}/(media|thumbnail)\.[a-z0-9]+$'
    and o.created_at < now() - interval '24 hours'
    and not exists(select 1 from public.stories s where s.media_path = o.name or s.thumbnail_path = o.name)
    and not exists(select 1 from private.storage_cleanup c where c.path = o.name)
  order by o.created_at
  limit greatest(1, least(coalesce(p_limit, 500), 1000))
  on conflict do nothing;
  get diagnostics queued = row_count;
  return queued;
end;
$$;

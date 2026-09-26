create index stories_expires on public.stories (expires_at);
create index notifications_story_mention on public.notifications ((data->>'storyId')) where type = 'story_mention';

alter table private.storage_cleanup
  add column next_attempt_at timestamptz not null default now(),
  add column claimed_at timestamptz,
  add column failed_at timestamptz,
  add column last_error text;

create index storage_cleanup_pending on private.storage_cleanup (next_attempt_at, created_at) where failed_at is null;

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

create function public.claim_storage_cleanup(p_limit integer default 100) returns table(path text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  update private.storage_cleanup c
  set failed_at = now(), claimed_at = null, last_error = coalesce(c.last_error, 'Cleanup retry limit reached')
  where c.failed_at is null and c.attempts >= 5;
  update private.storage_cleanup c
  set failed_at = now(), claimed_at = null, last_error = 'Unsafe storage path'
  where c.failed_at is null and (c.path !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9/._-]*$' or c.path like '%..%' or c.path like '%//%');
  return query
  with picked as (
    select c.path from private.storage_cleanup c
    where c.failed_at is null and c.attempts < 5 and c.next_attempt_at <= now()
      and (c.claimed_at is null or c.claimed_at < now() - interval '5 minutes')
    order by c.created_at limit greatest(1, least(coalesce(p_limit, 100), 500))
    for update skip locked
  )
  update private.storage_cleanup c set claimed_at = now(), attempts = c.attempts + 1
  from picked where c.path = picked.path returning c.path;
end;
$$;

create function public.complete_storage_cleanup(p_removed text[], p_failed text[] default '{}'::text[], p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  delete from private.storage_cleanup where path = any(coalesce(p_removed, '{}'::text[]));
  update private.storage_cleanup
  set claimed_at = null,
      last_error = left(coalesce(nullif(p_error, ''), 'Storage removal failed'), 300),
      failed_at = case when attempts >= 5 then now() else null end,
      next_attempt_at = now() + make_interval(mins => power(2, least(attempts, 6))::integer)
  where path = any(coalesce(p_failed, '{}'::text[]));
end;
$$;

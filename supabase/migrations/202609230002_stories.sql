-- Phase 2: Stories. Media lives in the existing private uploads bucket under a
-- per-story folder ({author}/stories/{story}/...), so a row and its objects share
-- one ownership boundary and one authorization decision.

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  media_path text not null unique,
  mime_type text not null,
  thumbnail_path text unique,
  width integer not null check (width > 0 and width <= 16384),
  height integer not null check (height > 0 and height <= 16384),
  duration double precision check (duration > 0 and duration <= 60),
  caption text check (char_length(caption) <= 500),
  audience text not null default 'followers' check (audience in ('followers', 'close_friends')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at = created_at + interval '24 hours'),
  check ((media_type = 'image' and mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif') and duration is null)
    or (media_type = 'video' and mime_type in ('video/mp4', 'video/quicktime', 'video/webm') and duration is not null)),
  check (media_path ~ '^[0-9a-f-]{36}/stories/[0-9a-f-]{36}/media\.(jpg|jpeg|png|webp|heic|heif|mp4|mov|webm)$'
    and split_part(media_path, '/', 1) = author_id::text and split_part(media_path, '/', 3) = id::text),
  check (thumbnail_path is null or (thumbnail_path ~ '^[0-9a-f-]{36}/stories/[0-9a-f-]{36}/thumbnail\.(jpg|jpeg|png|webp)$'
    and split_part(thumbnail_path, '/', 1) = author_id::text and split_part(thumbnail_path, '/', 3) = id::text))
);

alter table public.stories enable row level security;
revoke all on public.stories from anon, authenticated;
create policy anon_denied on public.stories for all to anon using (false) with check (false);

-- The database owns the story lifetime: created_at and expires_at are always
-- derived from the transaction clock, and nothing but caption/audience may change.
create function private.prepare_story() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.expires_at := new.created_at + interval '24 hours';
  elsif (new.id, new.author_id, new.media_type, new.media_path, new.mime_type, new.thumbnail_path, new.width, new.height, new.duration, new.created_at, new.expires_at)
    is distinct from (old.id, old.author_id, old.media_type, old.media_path, old.mime_type, old.thumbnail_path, old.width, old.height, old.duration, old.created_at, old.expires_at) then
    raise exception 'Only a story caption or audience can change' using errcode = '42501';
  end if;
  new.caption := nullif(btrim(new.caption), '');
  return new;
end;
$$;

create trigger story_lifecycle before insert or update on public.stories for each row execute function private.prepare_story();

-- Active stories per author ordered by expiry (equivalently creation). Also
-- covers the author_id foreign-key cascade on account deletion.
create index stories_author_active on public.stories (author_id, expires_at);

-- Single source of truth for who may see a story. Non-authors need an active
-- story and an accepted, unblocked follow; Close Friends stories additionally
-- need membership on the author's private list, which only this function reads.
create function private.can_view_story(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.stories s
    where s.id = target and (
      s.author_id = auth.uid() or (
        s.expires_at > now()
        and private.follows(auth.uid(), s.author_id)
        and (s.audience = 'followers' or exists(select 1 from public.close_friends cf where cf.owner_id = s.author_id and cf.friend_id = auth.uid()))
      )
    )
  );
$$;

revoke execute on function private.prepare_story(), private.can_view_story(uuid) from public, anon, authenticated;
grant execute on function private.can_view_story(uuid) to authenticated;

-- Stories are created only through the publishing RPC. Authors may change the
-- caption or audience, or delete; ownership, media, and lifetime are immutable.
grant select, delete on public.stories to authenticated;
grant update (caption, audience) on public.stories to authenticated;
create policy stories_read on public.stories for select to authenticated using (author_id = (select auth.uid()) or private.can_view_story(id));
create policy stories_update on public.stories for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy stories_delete on public.stories for delete to authenticated using (author_id = (select auth.uid()));

create function private.queue_story_media_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.storage_cleanup(path) values (old.media_path) on conflict do nothing;
  if old.thumbnail_path is not null then insert into private.storage_cleanup(path) values (old.thumbnail_path) on conflict do nothing; end if;
  return old;
end;
$$;

create trigger cleanup_story_media after delete on public.stories for each row execute function private.queue_story_media_cleanup();
revoke execute on function private.queue_story_media_cleanup() from public, anon, authenticated;

create function public.story_document(s public.stories) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'author_id', s.author_id, 'media_type', s.media_type, 'media_path', s.media_path, 'mime_type', s.mime_type,
    'thumbnail_path', s.thumbnail_path, 'width', s.width, 'height', s.height, 'duration', s.duration, 'caption', s.caption,
    'audience', s.audience, 'created_at', s.created_at, 'expires_at', s.expires_at,
    'author', (select jsonb_build_object('id', id, 'name', name, 'username', username, 'image', image) from public.users where id = s.author_id)
  );
$$;

-- Active means unexpired by the database clock, for everyone including the
-- author; expired rows stay readable to their author only, for future archives.
create function public.get_active_stories(p_author_id uuid) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select public.story_document(s) from public.stories s
  where s.author_id = p_author_id and s.expires_at > now()
  order by s.expires_at, s.id limit 100;
$$;

revoke execute on function public.story_document(public.stories), public.get_active_stories(uuid) from public, anon;
grant execute on function public.story_document(public.stories), public.get_active_stories(uuid) to authenticated;

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

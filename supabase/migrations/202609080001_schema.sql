create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
create extension if not exists pg_trgm with schema extensions;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  username text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  image text,
  bio text not null default '' check (char_length(bio) <= 500),
  location text not null default '' check (char_length(location) <= 120),
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_private (
  id uuid primary key references public.users(id) on delete cascade,
  "phoneNumber" text not null default '' check (char_length("phoneNumber") <= 30),
  address text not null default '' check (char_length(address) <= 300),
  language text not null default 'en' check (language in ('en', 'sq')),
  allow_messages boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 20000),
  file text,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (to_tsvector('simple', regexp_replace(body, '<[^>]*>', ' ', 'g'))) stored
);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  "postId" uuid not null references public.posts(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('image', 'video')),
  path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm')),
  width integer not null check (width > 0 and width <= 16384),
  height integer not null check (height > 0 and height <= 16384),
  duration double precision check (duration >= 0 and duration <= 60),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  thumbnail_path text,
  sort_order integer not null check (sort_order between 0 and 5),
  created_at timestamptz not null default now(),
  unique ("postId", sort_order),
  check (type <> 'video' or duration is not null),
  check (type <> 'image' or size_bytes <= 10485760),
  check (split_part(path, '/', 1) = "userId"::text),
  check (thumbnail_path is null or split_part(thumbnail_path, '/', 1) = "userId"::text)
);

create table public."postLikes" (
  id uuid primary key default gen_random_uuid(),
  "postId" uuid not null references public.posts(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  reaction text not null default 'like' check (reaction in ('like', 'love', 'celebrate')),
  created_at timestamptz not null default now(),
  unique ("postId", "userId")
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  "postId" uuid not null references public.posts(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  "parentId" uuid,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, "postId"),
  foreign key ("parentId", "postId") references public.comments(id, "postId") on delete cascade,
  check ("parentId" is null or "parentId" <> id)
);

create table public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  "commentId" uuid not null references public.comments(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique ("commentId", "userId")
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  "postId" uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique ("userId", "postId")
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.mutes (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  muted_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique ("userId", muted_id),
  check ("userId" <> muted_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.users(id) on delete cascade,
  user_high uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_low, user_high),
  check (user_low < user_high)
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, "userId")
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  text text not null default '' check (char_length(text) <= 4000),
  media_path text,
  mime_type text check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')),
  created_at timestamptz not null default now(),
  check (char_length(btrim(text)) > 0 or media_path is not null),
  check (media_path is null or split_part(media_path, '/', 1) = "userId"::text)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  "senderId" uuid references public.users(id) on delete set null,
  "receiverId" uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'reply', 'mention', 'follow', 'follow_request', 'follow_accepted', 'message')),
  title text not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  "userId" uuid primary key references public.users(id) on delete cascade,
  likes boolean not null default true,
  comments boolean not null default true,
  follows boolean not null default true,
  mentions boolean not null default true,
  messages boolean not null default true,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  device_id uuid not null,
  token text not null unique check (token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'),
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  unique ("userId", device_id)
);

create table public.hashtags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^[[:alnum:]_]{1,50}$'),
  created_at timestamptz not null default now()
);

create table public.post_hashtags (
  "postId" uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key ("postId", hashtag_id)
);

create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  "postId" uuid not null references public.posts(id) on delete cascade,
  "commentId" uuid references public.comments(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique nulls not distinct ("postId", "commentId", "userId")
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'post', 'comment', 'message', 'conversation')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'violence', 'sexual', 'fraud', 'other')),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution text check (char_length(resolution) <= 2000),
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table private.roles (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin'))
);

create table private.rate_limits (
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  bucket timestamptz not null,
  count integer not null default 1,
  primary key (user_id, action, bucket)
);

create table private.storage_cleanup (
  path text primary key,
  created_at timestamptz not null default now(),
  attempts integer not null default 0
);

create table private.push_queue (
  notification_id uuid primary key references public.notifications(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  attempts integer not null default 0,
  ticket_ids jsonb not null default '[]'::jsonb,
  last_error text
);

create index users_name_trgm on public.users using gin (lower(name) extensions.gin_trgm_ops);
create index users_username_prefix on public.users (username text_pattern_ops);
create index posts_feed on public.posts (created_at desc, id desc) where status = 'published';
create index posts_author_feed on public.posts ("userId", created_at desc, id desc);
create index posts_search on public.posts using gin (search_document);
create index media_post on public.post_media ("postId", sort_order);
create index likes_user on public."postLikes" ("userId", "postId");
create index comments_post on public.comments ("postId", created_at desc, id desc);
create index comments_parent on public.comments ("parentId");
create index comments_user on public.comments ("userId");
create index comment_likes_user on public.comment_likes ("userId");
create index follows_target on public.follows (following_id, status, created_at desc, id desc);
create index follows_source on public.follows (follower_id, status, created_at desc, id desc);
create index bookmarks_feed on public.bookmarks ("userId", created_at desc, id desc);
create index blocks_target on public.blocks (blocked_id, blocker_id);
create index mutes_target on public.mutes (muted_id);
create index conversations_high on public.conversations (user_high);
create index members_user on public.conversation_members ("userId", conversation_id);
create index messages_cursor on public.messages (conversation_id, created_at desc, id desc);
create index messages_user on public.messages ("userId");
create index notifications_unread on public.notifications ("receiverId") where read_at is null;
create index notifications_cursor on public.notifications ("receiverId", created_at desc, id desc);
create index notifications_sender on public.notifications ("senderId");
create index hashtags_prefix on public.hashtags (name text_pattern_ops);
create index hashtags_posts on public.post_hashtags (hashtag_id, "postId");
create index mentions_user on public.mentions ("userId");
create index mentions_comment on public.mentions ("commentId");
create index reports_queue on public.reports (status, created_at desc, id desc);
create index reports_reviewer on public.reports (reviewed_by);
create index rate_limit_expiry on private.rate_limits (bucket);

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('create policy anon_denied on public.%I for all to anon using (false) with check (false)', t);
  end loop;
end;
$$;

revoke all on all tables in schema private from public, anon, authenticated;
grant all on all tables in schema private to service_role;
grant usage on schema private to service_role;

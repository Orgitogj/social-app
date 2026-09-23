-- Phase 2: Story media in the existing private uploads bucket. Objects under
-- {author}/stories/{story}/ are uploadable only by that author, can never be
-- attached to posts, avatars, or messages, and are readable by others only while
-- private.can_view_story authorizes the story row that references them.

create or replace function private.owned_object(path text, image_only boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(path, '/', 1) = auth.uid()::text and split_part(path, '/', 2) <> 'stories' and exists (
    select 1 from storage.objects o where o.bucket_id = 'uploads' and o.name = path
      and coalesce((o.metadata->>'size')::bigint, 0) between 1 and case when image_only then 10485760 else 104857600 end
      and (not image_only or o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'))
  );
$$;

create policy uploads_story_create on storage.objects for insert to authenticated with check (
  bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/stories/[0-9a-f-]{36}/(media\.(jpg|jpeg|png|webp|heic|heif|mp4|mov|webm)|thumbnail\.(jpg|jpeg|png|webp))$'
);

create or replace function private.can_read_object(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    split_part(path, '/', 1) = auth.uid()::text
    or exists(select 1 from public.post_media where (post_media.path = can_read_object.path or thumbnail_path = can_read_object.path) and private.can_view_post("postId"))
    or exists(select 1 from public.users where image = path and not private.blocked(auth.uid(), id))
    or exists(select 1 from public.messages where media_path = path and private.is_member(conversation_id))
    or exists(select 1 from public.stories s where (s.media_path = can_read_object.path or s.thumbnail_path = can_read_object.path) and private.can_view_story(s.id))
  );
$$;

revoke execute on function private.owned_object(text, boolean), private.can_read_object(text) from public, anon;
grant execute on function private.can_read_object(text) to authenticated;

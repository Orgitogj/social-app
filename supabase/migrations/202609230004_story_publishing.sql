-- Phase 2: publishing. A story row can only be created by its author, for media
-- they already uploaded into that story's own folder, with a server-set lifetime.

create function private.owned_story_object(path text, image_only boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(path, '/', 1) = auth.uid()::text and split_part(path, '/', 2) = 'stories' and exists (
    select 1 from storage.objects o where o.bucket_id = 'uploads' and o.name = path
      and coalesce((o.metadata->>'size')::bigint, 0) between 1 and case when image_only then 10485760 else 104857600 end
      and (not image_only or o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'))
  );
$$;

-- Retrying with the same story id is idempotent, so an interrupted publish can
-- be resumed after its uploads succeeded without creating a duplicate story.
create function public.create_story(p_id uuid, p_media_type text, p_media_path text, p_mime_type text, p_width integer, p_height integer,
  p_duration double precision default null, p_thumbnail_path text default null, p_caption text default null, p_audience text default 'followers') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare story public.stories;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_id is null then raise exception 'A story id is required' using errcode = '23514'; end if;
  select * into story from public.stories where id = p_id;
  if found then
    if story.author_id = auth.uid() then return public.story_document(story); end if;
    raise exception 'Story is unavailable' using errcode = '42501';
  end if;
  if p_media_type is null or p_media_type not in ('image', 'video') or p_audience is null or p_audience not in ('followers', 'close_friends') then
    raise exception 'Invalid story options' using errcode = '23514';
  end if;
  perform private.consume_rate('stories', 10);
  if (select count(*) from public.stories where author_id = auth.uid() and expires_at > now()) >= 100 then
    raise exception 'Active story limit reached' using errcode = '23514';
  end if;
  if not private.owned_story_object(p_media_path, p_media_type = 'image')
    or not exists(select 1 from storage.objects where bucket_id = 'uploads' and name = p_media_path and metadata->>'mimetype' = p_mime_type)
    or (p_thumbnail_path is not null and not private.owned_story_object(p_thumbnail_path, true)) then
    raise exception 'Upload is unavailable or not owned by you' using errcode = '42501';
  end if;
  insert into public.stories(id, author_id, media_type, media_path, mime_type, thumbnail_path, width, height, duration, caption, audience)
  values (p_id, auth.uid(), p_media_type, p_media_path, p_mime_type, p_thumbnail_path, p_width, p_height, p_duration, p_caption, p_audience)
  returning * into story;
  return public.story_document(story);
end;
$$;

revoke execute on function private.owned_story_object(text, boolean) from public, anon, authenticated;
revoke execute on function public.create_story(uuid, text, text, text, integer, integer, double precision, text, text, text) from public, anon;
grant execute on function public.create_story(uuid, text, text, text, integer, integer, double precision, text, text, text) to authenticated;

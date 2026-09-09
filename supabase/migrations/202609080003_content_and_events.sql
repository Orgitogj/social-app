create function private.sanitize_html(input text) returns text
language plpgsql immutable set search_path = '' as $$
declare value text; token text; output text := ''; pos integer := 1; match_pos integer;
begin
  value := regexp_replace(coalesce(input, ''), '<(script|style|iframe|object)[^>]*>.*?</\1\s*>', '', 'gis');
  for token in select (regexp_matches(value, '<[^>]*>', 'g'))[1] loop
    match_pos := strpos(substr(value, pos), token) + pos - 1;
    output := output || replace(substr(value, pos, match_pos - pos), '<', '&lt;');
    if lower(token) ~ '^</?(p|div|br|b|strong|i|em|u|s|blockquote|ul|ol|li|h1|h2|h3|h4|pre|code)\s*/?>$' then
      output := output || lower(token);
    end if;
    pos := match_pos + char_length(token);
  end loop;
  return output || replace(substr(value, pos), '<', '&lt;');
end;
$$;

create function private.plain_text(input text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(coalesce(input, ''), '<[^>]*>', '', 'g'), '&(nbsp|#160|#x0*a0|#8203|#x200b);', ' ', 'gi'), '[[:space:]​‌‍]+', ' ', 'g'));
$$;

create function private.owned_object(path text, image_only boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(path, '/', 1) = auth.uid()::text and exists (
    select 1 from storage.objects o where o.bucket_id = 'uploads' and o.name = path
      and coalesce((o.metadata->>'size')::bigint, 0) between 1 and case when image_only then 10485760 else 104857600 end
      and (not image_only or o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'))
  );
$$;

create function private.write_post(target uuid, is_new boolean, content text, audience text, publication text, media jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare clean text; item jsonb; media_index integer := 0; existing_owner uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if audience not in ('public', 'followers', 'private') or publication not in ('draft', 'published') then raise exception 'Invalid post options' using errcode = '23514'; end if;
  if jsonb_typeof(media) <> 'array' or jsonb_array_length(media) > 6 then raise exception 'Choose at most six media files' using errcode = '23514'; end if;
  if char_length(content) > 20000 then raise exception 'Post is too long' using errcode = '23514'; end if;
  clean := private.sanitize_html(content);
  if char_length(private.plain_text(clean)) > 5000 or (private.plain_text(clean) = '' and jsonb_array_length(media) = 0) then raise exception 'Add content, up to 5000 characters' using errcode = '23514'; end if;
  perform private.consume_rate('posts', 5);
  select "userId" into existing_owner from public.posts where id = target for update;
  if is_new and existing_owner is not null then
    if existing_owner = auth.uid() then return target; end if;
    raise exception 'Post already exists' using errcode = '42501';
  end if;
  if not is_new and existing_owner is distinct from auth.uid() then raise exception 'Post is unavailable' using errcode = '42501'; end if;
  for item in select * from jsonb_array_elements(media) loop
    if not private.owned_object(item->>'path', item->>'type' = 'image')
      or (item->>'thumbnail_path' is not null and not private.owned_object(item->>'thumbnail_path', true)) then
      raise exception 'Upload is unavailable or not owned by you' using errcode = '42501';
    end if;
    if not exists(select 1 from storage.objects where bucket_id = 'uploads' and name = item->>'path' and metadata->>'mimetype' = item->>'mime_type' and (metadata->>'size')::bigint = (item->>'size_bytes')::bigint) then
      raise exception 'Media metadata does not match the upload' using errcode = '23514';
    end if;
  end loop;
  if is_new then
    insert into public.posts(id, "userId", body, visibility, status) values (target, auth.uid(), clean, audience, publication);
  else
    update public.posts set body = clean, visibility = audience, status = publication, file = null where id = target and "userId" = auth.uid();
    delete from public.post_media where "postId" = target;
  end if;
  for item in select * from jsonb_array_elements(media) loop
    insert into public.post_media("postId", "userId", type, path, mime_type, width, height, duration, size_bytes, thumbnail_path, sort_order)
    values (target, auth.uid(), item->>'type', item->>'path', item->>'mime_type', (item->>'width')::integer, (item->>'height')::integer, (item->>'duration')::double precision, (item->>'size_bytes')::bigint, item->>'thumbnail_path', media_index);
    media_index := media_index + 1;
  end loop;
  return target;
end;
$$;

create function public.create_post(p_id uuid, p_body text, p_visibility text, p_status text, p_media jsonb) returns uuid
language sql security definer set search_path = '' as $$
  select private.write_post(p_id, true, p_body, p_visibility, p_status, p_media);
$$;

create function public.update_post(p_id uuid, p_body text, p_visibility text, p_status text, p_media jsonb) returns uuid
language sql security definer set search_path = '' as $$
  select private.write_post(p_id, false, p_body, p_visibility, p_status, p_media);
$$;

create function private.emit_notification(sender uuid, receiver uuid, kind text, payload jsonb, key text) returns void
language plpgsql security definer set search_path = '' as $$
declare preferences public.notification_preferences; enabled boolean;
begin
  if sender is null or receiver is null or sender = receiver or private.blocked(sender, receiver) then return; end if;
  select * into preferences from public.notification_preferences where "userId" = receiver;
  enabled := case kind when 'like' then preferences.likes when 'comment' then preferences.comments when 'reply' then preferences.comments when 'mention' then preferences.mentions when 'message' then preferences.messages else preferences.follows end;
  if not coalesce(enabled, false) then return; end if;
  insert into public.notifications("senderId", "receiverId", type, title, data, dedupe_key)
  values (sender, receiver, kind, kind, payload, key) on conflict (dedupe_key) do nothing;
end;
$$;

create function private.index_content() returns trigger
language plpgsql security definer set search_path = '' as $$
declare token text; tag_id uuid; target uuid; parent_post uuid; source text;
begin
  if tg_table_name = 'posts' then
    delete from public.post_hashtags where "postId" = new.id;
    delete from public.mentions where "postId" = new.id and "commentId" is null;
    if new.status <> 'published' then return new; end if;
    parent_post := new.id;
    source := private.plain_text(new.body);
    for token in select distinct lower(m[2]) from regexp_matches(source, '(^|[^[:alnum:]_])#([[:alnum:]_]{1,50})', 'g') m limit 20 loop
      insert into public.hashtags(name) values (token) on conflict (name) do update set name = excluded.name returning id into tag_id;
      insert into public.post_hashtags("postId", hashtag_id) values (new.id, tag_id) on conflict do nothing;
    end loop;
  else
    delete from public.mentions where "commentId" = new.id;
    parent_post := new."postId";
    source := new.text;
  end if;
  for token in select distinct lower(m[2]) from regexp_matches(source, '(^|[^[:alnum:]_])@([a-zA-Z0-9_]{3,30})', 'g') m limit 20 loop
    select id into target from public.users where username = token;
    if target is not null and not private.blocked(new."userId", target) then
      insert into public.mentions("postId", "commentId", "userId") values (parent_post, case when tg_table_name = 'comments' then new.id else null end, target) on conflict do nothing;
      if exists(select 1 from public.posts p join public.users u on u.id = p."userId" where p.id = parent_post and p.status = 'published' and (p."userId" = target or (p.visibility <> 'private' and ((p.visibility = 'public' and not u.is_private) or private.follows(target, u.id))))) then
        perform private.emit_notification(new."userId", target, 'mention', jsonb_build_object('postId', parent_post, 'commentId', case when tg_table_name = 'comments' then new.id else null end), 'mention:' || new.id || ':' || target);
      end if;
    end if;
  end loop;
  return new;
end;
$$;

create function private.notify_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare receiver uuid; kind text; payload jsonb; sender uuid; dedupe text;
begin
  if tg_table_name = 'postLikes' then
    select "userId" into receiver from public.posts where id = new."postId";
    sender := new."userId"; kind := 'like'; payload := jsonb_build_object('postId', new."postId"); dedupe := 'like:' || sender || ':' || new."postId";
  elsif tg_table_name = 'comments' then
    select "userId" into receiver from public.posts where id = new."postId";
    sender := new."userId"; kind := 'comment'; payload := jsonb_build_object('postId', new."postId", 'commentId', new.id); dedupe := 'comment:' || new.id;
    if new."parentId" is not null then
      perform private.emit_notification(sender, (select "userId" from public.comments where id = new."parentId"), 'reply', payload, 'reply:' || new.id);
    end if;
  elsif tg_table_name = 'follows' then
    if tg_op = 'UPDATE' then
      if new.status = old.status then return new; end if;
      sender := new.following_id; receiver := new.follower_id; kind := 'follow_accepted';
    else
      sender := new.follower_id; receiver := new.following_id; kind := case when new.status = 'pending' then 'follow_request' else 'follow' end;
    end if;
    payload := jsonb_build_object('userId', sender, 'followId', new.id); dedupe := kind || ':' || sender || ':' || receiver;
  elsif tg_table_name = 'messages' then
    select "userId" into receiver from public.conversation_members where conversation_id = new.conversation_id and "userId" <> new."userId";
    sender := new."userId"; kind := 'message'; payload := jsonb_build_object('conversationId', new.conversation_id, 'messageId', new.id); dedupe := 'message:' || new.id;
    update public.conversations set updated_at = now() where id = new.conversation_id;
  end if;
  perform private.emit_notification(sender, receiver, kind, payload, dedupe);
  return new;
end;
$$;

create function private.enqueue_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.push_queue(notification_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create function private.apply_block() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows where (follower_id = new.blocker_id and following_id = new.blocked_id) or (follower_id = new.blocked_id and following_id = new.blocker_id);
  delete from public.notifications where ("senderId" = new.blocker_id and "receiverId" = new.blocked_id) or ("senderId" = new.blocked_id and "receiverId" = new.blocker_id);
  return new;
end;
$$;

create function private.queue_media_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'post_media' then
    insert into private.storage_cleanup(path) values (old.path) on conflict do nothing;
    if old.thumbnail_path is not null then insert into private.storage_cleanup(path) values (old.thumbnail_path) on conflict do nothing; end if;
  elsif tg_table_name = 'messages' and old.media_path is not null then
    insert into private.storage_cleanup(path) values (old.media_path) on conflict do nothing;
  elsif tg_table_name = 'users' and old.image is not null then
    if tg_op = 'DELETE' or old.image is distinct from new.image then
      insert into private.storage_cleanup(path) values (old.image) on conflict do nothing;
    end if;
  end if;
  return old;
end;
$$;

create function private.validate_avatar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.image is distinct from old.image and new.image is not null and not private.owned_object(new.image, true) then raise exception 'Avatar upload is unavailable' using errcode = '42501'; end if;
  return new;
end;
$$;

create function private.validate_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.media_path is not null and not private.owned_object(new.media_path, true) then raise exception 'Message upload is unavailable' using errcode = '42501'; end if;
  if private.plain_text(new.text) = '' and new.media_path is null then raise exception 'Message cannot be empty' using errcode = '23514'; end if;
  if not exists(select 1 from public.conversation_members m join public.user_private p on p.id = m."userId" where m.conversation_id = new.conversation_id and m."userId" <> auth.uid() and p.allow_messages) then raise exception 'This person is not accepting messages' using errcode = '42501'; end if;
  return new;
end;
$$;

create trigger index_post after insert or update of body, status on public.posts for each row execute function private.index_content();
create trigger index_comment after insert or update of text on public.comments for each row execute function private.index_content();
create trigger notify_like after insert on public."postLikes" for each row execute function private.notify_activity();
create trigger notify_comment after insert on public.comments for each row execute function private.notify_activity();
create trigger notify_follow after insert or update of status on public.follows for each row execute function private.notify_activity();
create trigger notify_message after insert on public.messages for each row execute function private.notify_activity();
create trigger queue_push after insert on public.notifications for each row execute function private.enqueue_push();
create trigger block_relations after insert on public.blocks for each row execute function private.apply_block();
create trigger cleanup_media after delete on public.post_media for each row execute function private.queue_media_cleanup();
create trigger cleanup_message after delete on public.messages for each row execute function private.queue_media_cleanup();
create trigger cleanup_avatar after update of image or delete on public.users for each row execute function private.queue_media_cleanup();
create trigger validate_avatar before update of image on public.users for each row execute function private.validate_avatar();
create trigger validate_message before insert on public.messages for each row execute function private.validate_message();

create function public.start_conversation(other_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare conversation uuid;
begin
  if auth.uid() is null or other_user = auth.uid() or private.blocked(auth.uid(), other_user)
    or not exists(select 1 from public.user_private where id = other_user and allow_messages) then raise exception 'Conversation is unavailable' using errcode = '42501'; end if;
  perform private.consume_rate('conversations', 10);
  insert into public.conversations(user_low, user_high) values (least(auth.uid(), other_user), greatest(auth.uid(), other_user))
  on conflict (user_low, user_high) do update set user_low = excluded.user_low returning id into conversation;
  insert into public.conversation_members(conversation_id, "userId") values (conversation, auth.uid()), (conversation, other_user) on conflict do nothing;
  return conversation;
end;
$$;

create function public.mark_conversation_read(target uuid, through_message uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare read_time timestamptz;
begin
  if not private.is_member(target) then raise exception 'Conversation is unavailable' using errcode = '42501'; end if;
  select created_at into read_time from public.messages where id = through_message and conversation_id = target;
  if read_time is null then raise exception 'Message is unavailable' using errcode = '42501'; end if;
  update public.conversation_members set last_read_at = greatest(coalesce(last_read_at, '-infinity'::timestamptz), least(read_time, now())) where conversation_id = target and "userId" = auth.uid();
end;
$$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create function private.can_read_object(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    split_part(path, '/', 1) = auth.uid()::text
    or exists(select 1 from public.post_media where (post_media.path = can_read_object.path or thumbnail_path = can_read_object.path) and private.can_view_post("postId"))
    or exists(select 1 from public.users where image = path and not private.blocked(auth.uid(), id))
    or exists(select 1 from public.messages where media_path = path and private.is_member(conversation_id))
  );
$$;

create policy uploads_read on storage.objects for select to authenticated using (bucket_id = 'uploads' and private.can_read_object(name));
create policy uploads_create on storage.objects for insert to authenticated with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|heic|heif|mp4|mov|webm)$');
create policy uploads_delete on storage.objects for delete to authenticated using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy uploads_anon_denied on storage.objects for all to anon using (false) with check (false);

create function private.realtime_conversation() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if realtime.topic() ~ '^conversation:[0-9a-f-]{36}$' then return split_part(realtime.topic(), ':', 2)::uuid; end if;
  return null;
exception when invalid_text_representation then return null;
end;
$$;

create policy conversation_realtime_read on realtime.messages for select to authenticated using (private.is_member(private.realtime_conversation()));
create policy conversation_realtime_write on realtime.messages for insert to authenticated with check (private.is_member(private.realtime_conversation()));

alter publication supabase_realtime add table public.posts, public.comments, public."postLikes", public.comment_likes, public.notifications, public.follows, public.messages, public.conversation_members, public.blocks;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.blocked(uuid, uuid), private.follows(uuid, uuid), private.can_view_post(uuid), private.can_view_comment(uuid), private.is_member(uuid), private.is_moderator(), private.can_report(text, uuid), private.can_read_object(text), private.realtime_conversation() to authenticated;
revoke execute on function public.create_post(uuid, text, text, text, jsonb), public.update_post(uuid, text, text, text, jsonb), public.start_conversation(uuid), public.mark_conversation_read(uuid, uuid) from public, anon;
grant execute on function public.create_post(uuid, text, text, text, jsonb), public.update_post(uuid, text, text, text, jsonb), public.start_conversation(uuid), public.mark_conversation_read(uuid, uuid) to authenticated;

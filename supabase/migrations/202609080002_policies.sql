create function private.blocked(a uuid, b uuid) returns boolean

language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create function private.follows(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.follows where follower_id = a and following_id = b and status = 'accepted') and not private.blocked(a, b);
$$;

create function private.can_view_post(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.posts p join public.users u on u.id = p."userId"
    where p.id = target and not private.blocked(auth.uid(), u.id) and (
      u.id = auth.uid() or (p.status = 'published' and p.visibility <> 'private'
      and ((not u.is_private and p.visibility = 'public') or private.follows(auth.uid(), u.id)))
    )
  );
$$;

create function private.is_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.conversation_members m join public.conversations c on c.id = m.conversation_id
    where m.conversation_id = target and m."userId" = auth.uid() and not private.blocked(c.user_low, c.user_high)
  );
$$;

create function private.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.roles where user_id = auth.uid() and role in ('moderator', 'admin'));
$$;

create function public.is_moderator() returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.is_moderator();
$$;

create function private.can_view_comment(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.comments where id = target and private.can_view_post("postId") and not private.blocked(auth.uid(), "userId"));
$$;

create function private.can_report(kind text, target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case kind
    when 'user' then exists(select 1 from public.users where id = target and id <> auth.uid() and not private.blocked(auth.uid(), id))
    when 'post' then private.can_view_post(target)
    when 'comment' then private.can_view_comment(target)
    when 'message' then exists(select 1 from public.messages where id = target and private.is_member(conversation_id))
    when 'conversation' then private.is_member(target)
    else false end;
$$;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.consume_rate(action_name text, maximum integer) returns void
language plpgsql security definer set search_path = '' as $$
declare current_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into private.rate_limits(user_id, action, bucket) values (auth.uid(), action_name, date_trunc('minute', now()))
  on conflict (user_id, action, bucket) do update set count = private.rate_limits.count + 1 returning count into current_count;
  if current_count > maximum then raise exception 'Too many requests. Try again shortly.' using errcode = 'P0001'; end if;
end;
$$;

create function private.limit_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.consume_rate(tg_table_name, tg_argv[0]::integer);
  new.created_at = now();
  return new;
end;
$$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare display_name text;
begin
  display_name := btrim(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''));
  if char_length(display_name) < 2 then display_name := 'LinkUp member'; end if;
  insert into public.users(id, name) values (new.id, left(display_name, 80));
  insert into public.user_private(id) values (new.id);
  insert into public.notification_preferences("userId") values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create function private.prepare_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.consume_rate('follows', 20);
    new.created_at := now();
    select case when is_private then 'pending' else 'accepted' end into new.status from public.users where id = new.following_id;
  elsif new.status <> 'accepted' or old.status <> 'pending' or auth.uid() <> old.following_id then
    raise exception 'Only the recipient can accept a pending request' using errcode = '42501';
  end if;
  return new;
end;
$$;

create function private.prepare_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ancestor uuid; depth integer := 0;
begin
  if new.text !~ '[^[:space:]​‌‍]' then raise exception 'Comment cannot be empty' using errcode = '23514'; end if;
  if tg_op = 'INSERT' then
    ancestor := new."parentId";
    while ancestor is not null loop
      depth := depth + 1;
      if depth > 8 or not private.can_view_comment(ancestor) then raise exception 'Reply is unavailable' using errcode = '23514'; end if;
      select "parentId" into ancestor from public.comments where id = ancestor;
    end loop;
  end if;
  return new;
end;
$$;

create function private.prepare_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'open';
    new.reviewed_by := null;
    new.resolution := null;
  else
    if not private.is_moderator() then raise exception 'Moderator access required' using errcode = '42501'; end if;
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger follow_status before insert or update on public.follows for each row execute function private.prepare_follow();
create trigger comment_validation before insert or update on public.comments for each row execute function private.prepare_comment();
create trigger report_review before insert or update on public.reports for each row execute function private.prepare_report();
create trigger comments_rate before insert on public.comments for each row execute function private.limit_insert('15');
create trigger likes_rate before insert on public."postLikes" for each row execute function private.limit_insert('60');
create trigger comment_likes_rate before insert on public.comment_likes for each row execute function private.limit_insert('60');
create trigger messages_rate before insert on public.messages for each row execute function private.limit_insert('30');
create trigger reports_rate before insert on public.reports for each row execute function private.limit_insert('5');
create trigger blocks_rate before insert on public.blocks for each row execute function private.limit_insert('30');
create trigger mutes_rate before insert on public.mutes for each row execute function private.limit_insert('30');

do $$
declare t text;
begin
  foreach t in array array['users', 'user_private', 'posts', 'comments', 'follows', 'conversations', 'notification_preferences', 'push_tokens', 'reports'] loop
    execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated_at()', t);
  end loop;
end;
$$;

grant select on public.users to authenticated;
grant update (name, username, image, bio, location, is_private) on public.users to authenticated;
create policy users_read on public.users for select to authenticated using (not private.blocked((select auth.uid()), id));
create policy users_update on public.users for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select on public.user_private to authenticated;
grant update ("phoneNumber", address, language, allow_messages) on public.user_private to authenticated;
create policy private_profile_read on public.user_private for select to authenticated using (id = (select auth.uid()));
create policy private_profile_update on public.user_private for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select, delete on public.posts to authenticated;
create policy posts_read on public.posts for select to authenticated using (private.can_view_post(id));
create policy posts_create on public.posts for insert to authenticated with check ("userId" = (select auth.uid()));
create policy posts_update on public.posts for update to authenticated using ("userId" = (select auth.uid())) with check ("userId" = (select auth.uid()));
create policy posts_delete on public.posts for delete to authenticated using ("userId" = (select auth.uid()));

grant select on public.post_media to authenticated;
create policy media_read on public.post_media for select to authenticated using (private.can_view_post("postId"));
create policy media_create on public.post_media for insert to authenticated with check ("userId" = (select auth.uid()) and exists(select 1 from public.posts where id = "postId" and "userId" = (select auth.uid())));
create policy media_delete on public.post_media for delete to authenticated using ("userId" = (select auth.uid()));

grant select, delete on public."postLikes" to authenticated;
grant insert (id, "postId", "userId", reaction) on public."postLikes" to authenticated;
grant update (reaction) on public."postLikes" to authenticated;
create policy likes_read on public."postLikes" for select to authenticated using (private.can_view_post("postId") and not private.blocked((select auth.uid()), "userId"));
create policy likes_create on public."postLikes" for insert to authenticated with check ("userId" = (select auth.uid()) and private.can_view_post("postId"));
create policy likes_update on public."postLikes" for update to authenticated using ("userId" = (select auth.uid()) and private.can_view_post("postId")) with check ("userId" = (select auth.uid()) and private.can_view_post("postId"));
create policy likes_delete on public."postLikes" for delete to authenticated using ("userId" = (select auth.uid()));

grant select, delete on public.comments to authenticated;
grant insert (id, "postId", "userId", "parentId", text) on public.comments to authenticated;
grant update (text) on public.comments to authenticated;
create policy comments_read on public.comments for select to authenticated using (private.can_view_post("postId") and not private.blocked((select auth.uid()), "userId"));
create policy comments_create on public.comments for insert to authenticated with check ("userId" = (select auth.uid()) and private.can_view_post("postId"));
create policy comments_update on public.comments for update to authenticated using ("userId" = (select auth.uid()) and private.can_view_post("postId")) with check ("userId" = (select auth.uid()) and private.can_view_post("postId"));
create policy comments_delete on public.comments for delete to authenticated using ("userId" = (select auth.uid()) or exists(select 1 from public.posts where id = "postId" and "userId" = (select auth.uid())));

grant select, delete on public.comment_likes to authenticated;
grant insert (id, "commentId", "userId") on public.comment_likes to authenticated;
create policy comment_likes_read on public.comment_likes for select to authenticated using (private.can_view_comment("commentId") and not private.blocked((select auth.uid()), "userId"));
create policy comment_likes_create on public.comment_likes for insert to authenticated with check ("userId" = (select auth.uid()) and private.can_view_comment("commentId"));
create policy comment_likes_delete on public.comment_likes for delete to authenticated using ("userId" = (select auth.uid()));

grant select, delete on public.follows to authenticated;
grant insert (id, follower_id, following_id) on public.follows to authenticated;
grant update (status) on public.follows to authenticated;
create policy follows_read on public.follows for select to authenticated using (not private.blocked((select auth.uid()), follower_id) and not private.blocked((select auth.uid()), following_id) and (status = 'accepted' or (select auth.uid()) in (follower_id, following_id)));
create policy follows_create on public.follows for insert to authenticated with check (follower_id = (select auth.uid()) and not private.blocked(follower_id, following_id));
create policy follows_update on public.follows for update to authenticated using (following_id = (select auth.uid()) and status = 'pending' and not private.blocked(follower_id, following_id)) with check (following_id = (select auth.uid()) and status = 'accepted' and not private.blocked(follower_id, following_id));
create policy follows_delete on public.follows for delete to authenticated using ((select auth.uid()) in (follower_id, following_id));

grant select, delete on public.bookmarks to authenticated;
grant insert (id, "userId", "postId") on public.bookmarks to authenticated;
create policy bookmarks_read on public.bookmarks for select to authenticated using ("userId" = (select auth.uid()) and private.can_view_post("postId"));
create policy bookmarks_create on public.bookmarks for insert to authenticated with check ("userId" = (select auth.uid()) and private.can_view_post("postId"));
create policy bookmarks_delete on public.bookmarks for delete to authenticated using ("userId" = (select auth.uid()));

grant select, delete on public.blocks to authenticated;
grant insert (id, blocker_id, blocked_id) on public.blocks to authenticated;
create policy blocks_read on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy blocks_create on public.blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy blocks_delete on public.blocks for delete to authenticated using (blocker_id = (select auth.uid()));

grant select, delete on public.mutes to authenticated;
grant insert (id, "userId", muted_id) on public.mutes to authenticated;
create policy mutes_read on public.mutes for select to authenticated using ("userId" = (select auth.uid()));
create policy mutes_create on public.mutes for insert to authenticated with check ("userId" = (select auth.uid()));
create policy mutes_delete on public.mutes for delete to authenticated using ("userId" = (select auth.uid()));

grant select on public.conversations, public.conversation_members, public.messages to authenticated;
grant insert (id, conversation_id, "userId", text, media_path, mime_type) on public.messages to authenticated;
create policy conversations_read on public.conversations for select to authenticated using (private.is_member(id));
create policy members_read on public.conversation_members for select to authenticated using (private.is_member(conversation_id));
create policy messages_read on public.messages for select to authenticated using (private.is_member(conversation_id));
create policy messages_create on public.messages for insert to authenticated with check ("userId" = (select auth.uid()) and private.is_member(conversation_id));

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_read on public.notifications for select to authenticated using ("receiverId" = (select auth.uid()) and ("senderId" is null or not private.blocked((select auth.uid()), "senderId")));
create policy notifications_update on public.notifications for update to authenticated using ("receiverId" = (select auth.uid())) with check ("receiverId" = (select auth.uid()));

grant select on public.notification_preferences to authenticated;
grant update (likes, comments, follows, mentions, messages, push_enabled) on public.notification_preferences to authenticated;
create policy preferences_read on public.notification_preferences for select to authenticated using ("userId" = (select auth.uid()));
create policy preferences_update on public.notification_preferences for update to authenticated using ("userId" = (select auth.uid())) with check ("userId" = (select auth.uid()));

grant select, delete on public.push_tokens to authenticated;
grant insert ("userId", device_id, token, platform) on public.push_tokens to authenticated;
grant update (token, platform) on public.push_tokens to authenticated;
create policy tokens_read on public.push_tokens for select to authenticated using ("userId" = (select auth.uid()));
create policy tokens_create on public.push_tokens for insert to authenticated with check ("userId" = (select auth.uid()));
create policy tokens_update on public.push_tokens for update to authenticated using ("userId" = (select auth.uid())) with check ("userId" = (select auth.uid()));
create policy tokens_delete on public.push_tokens for delete to authenticated using ("userId" = (select auth.uid()));

grant select on public.hashtags, public.post_hashtags, public.mentions to authenticated;
create policy hashtags_read on public.hashtags for select to authenticated using (exists(select 1 from public.post_hashtags where hashtag_id = hashtags.id));
create policy post_hashtags_read on public.post_hashtags for select to authenticated using (private.can_view_post("postId"));
create policy mentions_read on public.mentions for select to authenticated using (private.can_view_post("postId") and ("commentId" is null or private.can_view_comment("commentId")) and not private.blocked((select auth.uid()), "userId"));

grant select on public.reports to authenticated;
grant insert (id, reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;
grant update (status, resolution) on public.reports to authenticated;
create policy reports_read on public.reports for select to authenticated using (reporter_id = (select auth.uid()) or private.is_moderator());
create policy reports_create on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()) and private.can_report(target_type, target_id));
create policy reports_update on public.reports for update to authenticated using (private.is_moderator()) with check (private.is_moderator());

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.blocked(uuid, uuid), private.follows(uuid, uuid), private.can_view_post(uuid), private.can_view_comment(uuid), private.is_member(uuid), private.is_moderator(), private.can_report(text, uuid) to authenticated;
revoke execute on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

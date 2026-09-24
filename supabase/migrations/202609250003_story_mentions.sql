create function private.extract_mentions(source text) returns setof text
language sql immutable set search_path = '' as $$
  select distinct lower(m[2]) from regexp_matches(coalesce(source, ''), '(^|[^[:alnum:]_])@([a-zA-Z0-9_]{3,30})', 'g') m limit 20;
$$;

revoke execute on function private.extract_mentions(text) from public, anon, authenticated;

create or replace function private.index_content() returns trigger
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
  for token in select private.extract_mentions(source) loop
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

create function private.story_visible_to(target uuid, viewer uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select viewer is not null and exists (
    select 1 from public.stories s
    where s.id = target and (
      s.author_id = viewer or (
        s.expires_at > now()
        and private.follows(viewer, s.author_id)
        and (s.audience = 'followers' or exists(select 1 from public.close_friends cf where cf.owner_id = s.author_id and cf.friend_id = viewer))
      )
    )
  );
$$;

revoke execute on function private.story_visible_to(uuid, uuid) from public, anon, authenticated;

create or replace function private.can_view_story(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.story_visible_to(target, auth.uid());
$$;

create table public.story_mentions (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index story_mentions_user on public.story_mentions (user_id);

alter table public.story_mentions enable row level security;
revoke all on public.story_mentions from anon, authenticated;
create policy anon_denied on public.story_mentions for all to anon using (false) with check (false);
grant select on public.story_mentions to authenticated;
create policy story_mentions_read on public.story_mentions for select to authenticated using (
  exists(select 1 from public.stories s where s.id = story_id and s.author_id = (select auth.uid()))
  or (user_id = (select auth.uid()) and private.can_view_story(story_id))
);

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'reply', 'mention', 'follow', 'follow_request', 'follow_accepted', 'message', 'story_mention'));

create or replace function private.emit_notification(sender uuid, receiver uuid, kind text, payload jsonb, key text) returns void
language plpgsql security definer set search_path = '' as $$
declare preferences public.notification_preferences; enabled boolean;
begin
  if sender is null or receiver is null or sender = receiver or private.blocked(sender, receiver) then return; end if;
  select * into preferences from public.notification_preferences where "userId" = receiver;
  enabled := case kind
    when 'like' then preferences.likes
    when 'comment' then preferences.comments
    when 'reply' then preferences.replies
    when 'mention' then preferences.mentions
    when 'story_mention' then preferences.mentions
    when 'message' then preferences.messages
    when 'follow_request' then preferences.follow_requests
    else preferences.follows
  end;
  if not coalesce(enabled, false) then return; end if;
  insert into public.notifications("senderId", "receiverId", type, title, data, dedupe_key)
  values (sender, receiver, kind, case kind
    when 'like' then 'liked your post'
    when 'comment' then 'commented on your post'
    when 'reply' then 'replied to your comment'
    when 'mention' then 'mentioned you'
    when 'story_mention' then 'mentioned you in their story'
    when 'follow' then 'started following you'
    when 'follow_request' then 'requested to follow you'
    when 'follow_accepted' then 'accepted your follow request'
    when 'message' then 'sent you a message'
    else 'sent you a notification' end, payload, key) on conflict (dedupe_key) do nothing;
end;
$$;

create function private.index_story_mentions() returns trigger
language plpgsql security definer set search_path = '' as $$
declare token text; target uuid;
begin
  if tg_op = 'UPDATE' then
    if new.caption is not distinct from old.caption then return new; end if;
    delete from public.story_mentions where story_id = new.id;
  end if;
  for token in select private.extract_mentions(new.caption) loop
    select id into target from public.users where username = token;
    if target is not null and target <> new.author_id and not private.blocked(new.author_id, target) then
      insert into public.story_mentions(story_id, user_id) values (new.id, target) on conflict do nothing;
      if private.story_visible_to(new.id, target) then
        perform private.emit_notification(new.author_id, target, 'story_mention', jsonb_build_object('storyId', new.id, 'userId', new.author_id), 'story_mention:' || new.id || ':' || target);
      end if;
    end if;
  end loop;
  return new;
end;
$$;

revoke execute on function private.index_story_mentions() from public, anon, authenticated;
create trigger index_story_mentions after insert or update of caption on public.stories for each row execute function private.index_story_mentions();

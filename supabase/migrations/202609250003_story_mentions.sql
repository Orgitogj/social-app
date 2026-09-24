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

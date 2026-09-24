create table public.close_friends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  friend_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, friend_id),
  check (owner_id <> friend_id)
);

alter table public.close_friends enable row level security;
revoke all on public.close_friends from anon, authenticated;
create policy anon_denied on public.close_friends for all to anon using (false) with check (false);

create index close_friends_friend on public.close_friends (friend_id, owner_id);

grant select, delete on public.close_friends to authenticated;
grant insert (id, owner_id, friend_id) on public.close_friends to authenticated;
create policy close_friends_read on public.close_friends for select to authenticated using (owner_id = (select auth.uid()));
create policy close_friends_create on public.close_friends for insert to authenticated with check (owner_id = (select auth.uid()) and private.follows(friend_id, owner_id));
create policy close_friends_delete on public.close_friends for delete to authenticated using (owner_id = (select auth.uid()));
create trigger close_friends_rate before insert on public.close_friends for each row execute function private.limit_insert('60');

create function private.remove_blocked_close_friends() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.close_friends
  where (owner_id = new.blocker_id and friend_id = new.blocked_id) or (owner_id = new.blocked_id and friend_id = new.blocker_id);
  return new;
end;
$$;

create trigger block_close_friends after insert on public.blocks for each row execute function private.remove_blocked_close_friends();
revoke execute on function private.remove_blocked_close_friends() from public, anon, authenticated;

create function public.get_close_friends(p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 30) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('id', cf.id, 'friend_id', cf.friend_id, 'created_at', cf.created_at,
    'user', jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'image', u.image))
  from public.close_friends cf join public.users u on u.id = cf.friend_id
  where cf.owner_id = auth.uid()
    and (p_before_time is null or (cf.created_at, cf.id) < (p_before_time, p_before_id))
  order by cf.created_at desc, cf.id desc limit greatest(1, least(p_limit, 50));
$$;

create function public.search_close_friend_candidates(p_query text default '', p_after_id uuid default null, p_limit integer default 30) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'image', u.image,
    'is_close_friend', exists(select 1 from public.close_friends cf where cf.owner_id = auth.uid() and cf.friend_id = u.id))
  from public.follows f join public.users u on u.id = f.follower_id
  where f.following_id = auth.uid() and f.status = 'accepted'
    and not private.blocked(auth.uid(), u.id)
    and (p_after_id is null or u.id > p_after_id)
    and (btrim(p_query) = '' or lower(u.name) like replace(replace(lower(btrim(left(p_query, 100))), '%', '\%'), '_', '\_') || '%'
      or u.username like replace(replace(lower(btrim(left(p_query, 100))), '%', '\%'), '_', '\_') || '%')
  order by u.id limit greatest(1, least(p_limit, 50));
$$;

revoke execute on function public.get_close_friends(timestamptz, uuid, integer), public.search_close_friend_candidates(text, uuid, integer) from public, anon;
grant execute on function public.get_close_friends(timestamptz, uuid, integer), public.search_close_friend_candidates(text, uuid, integer) to authenticated;

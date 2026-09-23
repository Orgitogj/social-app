-- Phase 2: Close Friends. The list is private to its owner: members are never
-- notified, cannot read the list, and learn of membership only by being shown a
-- Close Friends story once Stories visibility is evaluated server-side.

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

-- The unique (owner_id, friend_id) index serves owner lookups and story checks;
-- this one serves "whose lists am I on" story trays and account-deletion cascades.
create index close_friends_friend on public.close_friends (friend_id, owner_id);

-- Only accepted, unblocked followers are eligible. Stories still re-check the
-- follow at read time, so a later unfollow or block revokes access immediately.
grant select, delete on public.close_friends to authenticated;
grant insert (id, owner_id, friend_id) on public.close_friends to authenticated;
create policy close_friends_read on public.close_friends for select to authenticated using (owner_id = (select auth.uid()));
create policy close_friends_create on public.close_friends for insert to authenticated with check (owner_id = (select auth.uid()) and private.follows(friend_id, owner_id));
create policy close_friends_delete on public.close_friends for delete to authenticated using (owner_id = (select auth.uid()));
create trigger close_friends_rate before insert on public.close_friends for each row execute function private.limit_insert('60');

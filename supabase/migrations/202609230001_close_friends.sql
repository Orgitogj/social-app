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

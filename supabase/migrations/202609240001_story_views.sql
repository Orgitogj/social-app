create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index story_views_viewer on public.story_views (viewer_id);

alter table public.story_views enable row level security;
revoke all on public.story_views from anon, authenticated;
create policy anon_denied on public.story_views for all to anon using (false) with check (false);

grant select on public.story_views to authenticated;
create policy story_views_read_own on public.story_views for select to authenticated using (viewer_id = (select auth.uid()));

create function public.mark_story_viewed(p_story_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare story_author uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select author_id into story_author from public.stories where id = p_story_id and expires_at > now();
  if not found or not private.can_view_story(p_story_id) then raise exception 'Story is unavailable' using errcode = '42501'; end if;
  if story_author = auth.uid() then return false; end if;
  if exists(select 1 from public.story_views where story_id = p_story_id and viewer_id = auth.uid()) then return true; end if;
  perform private.consume_rate('story_views', 300);
  insert into public.story_views(story_id, viewer_id) values (p_story_id, auth.uid()) on conflict do nothing;
  return true;
end;
$$;

revoke execute on function public.mark_story_viewed(uuid) from public, anon;
grant execute on function public.mark_story_viewed(uuid) to authenticated;

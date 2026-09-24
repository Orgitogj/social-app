-- Phases 8-9: Story tray and per-viewer viewed state. Both functions run as the
-- caller, so stories and story_views row security decide what is returned and a
-- viewer only ever learns about their own views.

-- Active stories now carry whether the caller has viewed each one, so the viewer
-- can start at the first unviewed story without reading raw view rows.
create or replace function public.get_active_stories(p_author_id uuid) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select public.story_document(s) || jsonb_build_object('viewed',
    s.author_id = auth.uid() or exists(select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()))
  from public.stories s
  where s.author_id = p_author_id and s.expires_at > now()
  order by s.expires_at, s.id limit 100;
$$;

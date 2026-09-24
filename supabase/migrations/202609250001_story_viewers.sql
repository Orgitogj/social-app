create policy story_views_read_author on public.story_views for select to authenticated using (
  exists(select 1 from public.stories s where s.id = story_id and s.author_id = (select auth.uid()))
);

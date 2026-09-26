create function public.get_story(p_story_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select public.story_document(s) || jsonb_build_object(
    'viewed', s.author_id = auth.uid() or exists(select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()),
    'view_count', case when s.author_id = auth.uid() then (select count(*) from public.story_views v where v.story_id = s.id) end,
    'can_reply', s.author_id <> auth.uid() and private.accepts_messages(s.author_id))
  from public.stories s
  where s.id = p_story_id and s.expires_at > now();
$$;

revoke execute on function public.get_story(uuid) from public, anon;
grant execute on function public.get_story(uuid) to authenticated;

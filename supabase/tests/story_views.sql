begin;
select plan(41);

select has_table('public', 'story_views', 'story views table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.story_views'::regclass), 'story views have row level security');
select ok(not has_table_privilege('authenticated', 'public.story_views', 'INSERT'), 'story views cannot be inserted directly');
select ok(not has_table_privilege('authenticated', 'public.story_views', 'UPDATE'), 'story views cannot be updated directly');
select ok(not has_table_privilege('authenticated', 'public.story_views', 'DELETE'), 'story views cannot be deleted directly');
select ok(not has_table_privilege('anon', 'public.story_views', 'SELECT'), 'anonymous clients cannot read story views');
select ok(not has_function_privilege('anon', 'public.mark_story_viewed(uuid)', 'execute'), 'anonymous clients cannot record views');

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('6b000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'sv-ava@example.test', '{}'::jsonb, '{"name":"Ava"}'::jsonb, now(), now()),
  ('6b000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'sv-cole@example.test', '{}'::jsonb, '{"name":"Cole"}'::jsonb, now(), now()),
  ('6b000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'sv-nora@example.test', '{}'::jsonb, '{"name":"Nora"}'::jsonb, now(), now()),
  ('6b000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sv-sid@example.test', '{}'::jsonb, '{"name":"Sid"}'::jsonb, now(), now()),
  ('6b000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'sv-ezra@example.test', '{}'::jsonb, '{"name":"Ezra"}'::jsonb, now(), now()),
  ('6b000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'sv-bea@example.test', '{}'::jsonb, '{"name":"Bea"}'::jsonb, now(), now());
update public.users set is_private = true where id in ('6b000000-0000-4000-8000-000000000001', '6b000000-0000-4000-8000-000000000006');

insert into public.stories(id, author_id, media_type, media_path, mime_type, width, height, audience, expires_at) values
  ('7b000000-0000-4000-8000-000000000001', '6b000000-0000-4000-8000-000000000001', 'image', '6b000000-0000-4000-8000-000000000001/stories/7b000000-0000-4000-8000-000000000001/media.jpg', 'image/jpeg', 1080, 1920, 'followers', now()),
  ('7b000000-0000-4000-8000-000000000002', '6b000000-0000-4000-8000-000000000001', 'image', '6b000000-0000-4000-8000-000000000001/stories/7b000000-0000-4000-8000-000000000002/media.jpg', 'image/jpeg', 1080, 1920, 'close_friends', now()),
  ('7b000000-0000-4000-8000-000000000003', '6b000000-0000-4000-8000-000000000001', 'image', '6b000000-0000-4000-8000-000000000001/stories/7b000000-0000-4000-8000-000000000003/media.jpg', 'image/jpeg', 1080, 1920, 'followers', now()),
  ('7b000000-0000-4000-8000-000000000004', '6b000000-0000-4000-8000-000000000006', 'image', '6b000000-0000-4000-8000-000000000006/stories/7b000000-0000-4000-8000-000000000004/media.jpg', 'image/jpeg', 1080, 1920, 'followers', now()),
  ('7b000000-0000-4000-8000-000000000005', '6b000000-0000-4000-8000-000000000003', 'image', '6b000000-0000-4000-8000-000000000003/stories/7b000000-0000-4000-8000-000000000005/media.jpg', 'image/jpeg', 1080, 1920, 'followers', now());

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('6b000000-0000-4000-8000-000000000002', '6b000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('6b000000-0000-4000-8000-000000000003', '6b000000-0000-4000-8000-000000000001'), ('6b000000-0000-4000-8000-000000000003', '6b000000-0000-4000-8000-000000000006');
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('6b000000-0000-4000-8000-000000000005', '6b000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000006', 'role', 'authenticated')::text, true);
update public.follows set status = 'accepted' where following_id = '6b000000-0000-4000-8000-000000000006';
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
update public.follows set status = 'accepted' where following_id = '6b000000-0000-4000-8000-000000000001';
insert into public.close_friends(owner_id, friend_id) values ('6b000000-0000-4000-8000-000000000001', '6b000000-0000-4000-8000-000000000002');

select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((select count(*) from public.get_story_tray()), 3::bigint, 'the tray groups own and followed authors with active stories');
select is((select t->'author'->>'id' from public.get_story_tray() t limit 1), '6b000000-0000-4000-8000-000000000003', 'the caller''s own stories come first');
select is((select (t->>'unviewed_count')::int from public.get_story_tray() t where t->>'is_own' = 'true'), 0, 'own stories are never unviewed');
select is((select (t->>'story_count')::int from public.get_story_tray() t where t->'author'->>'id' = '6b000000-0000-4000-8000-000000000001'), 2, 'a follower''s tray excludes close friends stories');
select is((select (t->>'has_close_friends')::boolean from public.get_story_tray() t where t->'author'->>'id' = '6b000000-0000-4000-8000-000000000001'), false, 'a follower sees no close friends indication');
select ok(not exists(select 1 from public.get_story_tray() t where t ? 'media_path' or t::text like '%/stories/%'), 'the tray returns no media paths');

select is(public.mark_story_viewed('7b000000-0000-4000-8000-000000000001'), true, 'a follower can record a view of a permitted story');
select is((select count(*) from public.story_views where story_id = '7b000000-0000-4000-8000-000000000001'), 1::bigint, 'the view is stored for the caller');
create temporary table first_view on commit drop as select viewed_at from public.story_views where story_id = '7b000000-0000-4000-8000-000000000001';
select is(public.mark_story_viewed('7b000000-0000-4000-8000-000000000001'), true, 'repeating a view succeeds');
select is((select count(*) from public.story_views where story_id = '7b000000-0000-4000-8000-000000000001'), 1::bigint, 'repeated views stay one logical view');
select is((select viewed_at from public.story_views where story_id = '7b000000-0000-4000-8000-000000000001'), (select viewed_at from first_view), 'the first view keeps its server timestamp');
select throws_ok($$insert into public.story_views(story_id, viewer_id) values ('7b000000-0000-4000-8000-000000000001', '6b000000-0000-4000-8000-000000000002')$$, '42501', null, 'a viewer cannot fabricate a view for another user');
select throws_ok($$select public.mark_story_viewed('7b000000-0000-4000-8000-000000000002')$$, '42501', 'Story is unavailable', 'a restricted close friends story cannot be viewed to record a view');
select throws_ok($$select public.mark_story_viewed('7b000000-0000-4000-8000-0000000000ff')$$, '42501', 'Story is unavailable', 'a guessed story id does not bypass access rules');

select is((select (t->>'unviewed_count')::int from public.get_story_tray() t where t->'author'->>'id' = '6b000000-0000-4000-8000-000000000001'), 1, 'one of two stories viewed leaves the author partially viewed');
select is((select array_agg((s->>'viewed')::boolean order by s->>'id') from public.get_active_stories('6b000000-0000-4000-8000-000000000001') s), array[true, false], 'active stories report the caller''s viewed state per story');
select lives_ok($$select public.mark_story_viewed('7b000000-0000-4000-8000-000000000004')$$, 'a follower can view another author''s story');
select is((select array_agg(t->'author'->>'id') from public.get_story_tray() t), array['6b000000-0000-4000-8000-000000000003', '6b000000-0000-4000-8000-000000000001', '6b000000-0000-4000-8000-000000000006'], 'authors with unviewed stories come before fully viewed authors');
select lives_ok($$select public.mark_story_viewed('7b000000-0000-4000-8000-000000000003')$$, 'the remaining story can be viewed');
select is((select (t->>'unviewed_count')::int from public.get_story_tray() t where t->'author'->>'id' = '6b000000-0000-4000-8000-000000000001'), 0, 'viewing every story leaves the author fully viewed');

select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is(public.mark_story_viewed('7b000000-0000-4000-8000-000000000002'), true, 'a close friend can view a close friends story');
select is((select count(*) from public.story_views), 1::bigint, 'a viewer reads only their own views');
select is((select (t->>'has_close_friends')::boolean from public.get_story_tray() t where t->'author'->>'id' = '6b000000-0000-4000-8000-000000000001'), true, 'a close friend sees the close friends indication');
select is((select (t->>'story_count')::int from public.get_story_tray() t where t->'author'->>'id' = '6b000000-0000-4000-8000-000000000001'), 3, 'a close friend''s tray includes close friends stories');
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*) from public.story_views), 0::bigint, 'an author cannot read who viewed their stories yet');
select is(public.mark_story_viewed('7b000000-0000-4000-8000-000000000001'), false, 'an author viewing their own story is not an external view');
reset role;
select is((select count(*) from public.story_views where viewer_id = '6b000000-0000-4000-8000-000000000001'), 0::bigint, 'no view row is stored for the author');
set local role authenticated;

select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000004', 'role', 'authenticated')::text, true);
select throws_ok($$select public.mark_story_viewed('7b000000-0000-4000-8000-000000000001')$$, '42501', 'Story is unavailable', 'a stranger cannot record a view');
select is((select count(*) from public.get_story_tray()), 0::bigint, 'a stranger''s tray excludes private authors');
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
select is((select count(*) from public.get_story_tray()), 1::bigint, 'a follower sees the author in the tray before a block');
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
insert into public.blocks(blocker_id, blocked_id) values ('6b000000-0000-4000-8000-000000000001', '6b000000-0000-4000-8000-000000000005');
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
select throws_ok($$select public.mark_story_viewed('7b000000-0000-4000-8000-000000000001')$$, '42501', 'Story is unavailable', 'a blocked user cannot create a story view');
select is((select count(*) from public.get_story_tray()), 0::bigint, 'blocked authors are excluded from the tray');
reset role;
alter table public.stories disable trigger story_lifecycle;
update public.stories set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' where id = '7b000000-0000-4000-8000-000000000001';
alter table public.stories enable trigger story_lifecycle;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '6b000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select throws_ok($$select public.mark_story_viewed('7b000000-0000-4000-8000-000000000001')$$, '42501', 'Story is unavailable', 'an expired story cannot receive a new view');
select is((select (t->>'story_count')::int from public.get_story_tray() t where t->'author'->>'id' = '6b000000-0000-4000-8000-000000000001'), 2, 'expired stories are excluded from the tray');
select finish();
rollback;

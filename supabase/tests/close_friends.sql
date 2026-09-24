begin;
select plan(31);

select has_table('public', 'close_friends', 'close friends table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.close_friends'::regclass), 'close friends has row level security');
select ok(not has_table_privilege('authenticated', 'public.close_friends', 'UPDATE'), 'memberships cannot be edited in place');
select ok(not has_table_privilege('anon', 'public.close_friends', 'SELECT'), 'anonymous clients cannot read memberships');
select ok(not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'close_friends'), 'membership changes are not broadcast over realtime');
select ok(not has_function_privilege('authenticated', 'private.remove_blocked_close_friends()', 'execute'), 'block cleanup is not callable by clients');

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('2a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'cf-olivia@example.test', '{}'::jsonb, '{"name":"Olivia"}'::jsonb, now(), now()),
  ('2a000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'cf-finn@example.test', '{}'::jsonb, '{"name":"Finn"}'::jsonb, now(), now()),
  ('2a000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'cf-grace@example.test', '{}'::jsonb, '{"name":"Grace"}'::jsonb, now(), now()),
  ('2a000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'cf-sam@example.test', '{}'::jsonb, '{"name":"Sam"}'::jsonb, now(), now()),
  ('2a000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'cf-blake@example.test', '{}'::jsonb, '{"name":"Blake"}'::jsonb, now(), now());

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '2a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('2a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '2a000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('2a000000-0000-4000-8000-000000000003', '2a000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '2a000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('2a000000-0000-4000-8000-000000000005', '2a000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claims', json_build_object('sub', '2a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
select lives_ok($$insert into public.close_friends(owner_id, friend_id) values ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000002')$$, 'an owner can add an accepted follower');
select throws_ok($$insert into public.close_friends(owner_id, friend_id) values ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000002')$$, '23505', null, 'a duplicate membership is rejected');
select throws_ok($$insert into public.close_friends(owner_id, friend_id) values ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001')$$, '42501', null, 'an owner cannot add themselves');
select throws_ok($$insert into public.close_friends(owner_id, friend_id) values ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000004')$$, '42501', null, 'a non-follower is not eligible');
select throws_ok($$insert into public.close_friends(owner_id, friend_id) values ('2a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000003')$$, '42501', null, 'a user cannot add to another user''s list');
select lives_ok($$insert into public.close_friends(owner_id, friend_id) values ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000005')$$, 'an owner can add a second follower');
select is((select count(*) from public.get_close_friends()), 2::bigint, 'the owner can list their close friends');
select is((select count(*) from public.search_close_friend_candidates('', null, 50)), 3::bigint, 'candidates are exactly the owner''s accepted followers');
select ok((select (c->>'is_close_friend')::boolean from public.search_close_friend_candidates('Finn') c), 'candidate search flags current members');
select ok(not (select (c->>'is_close_friend')::boolean from public.search_close_friend_candidates('Grace') c), 'candidate search flags non-members');
select is((select count(*) from public.search_close_friend_candidates('Sam')), 0::bigint, 'strangers are not offered as candidates');

select set_config('request.jwt.claims', json_build_object('sub', '2a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*) from public.close_friends), 0::bigint, 'a member cannot read the owner''s list');
select is((select count(*) from public.close_friends where friend_id = '2a000000-0000-4000-8000-000000000002'), 0::bigint, 'a member cannot query their own membership');
select is((select count(*) from public.get_close_friends()), 0::bigint, 'the list query only returns the caller''s own list');
select is((select count(*) from public.search_close_friend_candidates('', null, 50) c where (c->>'is_close_friend')::boolean), 0::bigint, 'candidate search does not reveal other lists');
delete from public.close_friends where owner_id = '2a000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', json_build_object('sub', '2a000000-0000-4000-8000-000000000004', 'role', 'authenticated')::text, true);
select is((select count(*) from public.close_friends), 0::bigint, 'a stranger cannot read any list');
delete from public.close_friends where owner_id = '2a000000-0000-4000-8000-000000000001';
reset role;
select is((select count(*) from public.close_friends where owner_id = '2a000000-0000-4000-8000-000000000001'), 2::bigint, 'other users cannot remove members from a list');
select is((select count(*) from public.notifications where "senderId" = '2a000000-0000-4000-8000-000000000001'), 0::bigint, 'adding a close friend sends no notification');
select throws_ok($$insert into public.close_friends(owner_id, friend_id) values ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001')$$, '23514', null, 'self membership is rejected by a constraint even for trusted writers');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '2a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
delete from public.close_friends where friend_id = '2a000000-0000-4000-8000-000000000002';
select is((select count(*) from public.close_friends where friend_id = '2a000000-0000-4000-8000-000000000002'), 0::bigint, 'an owner can remove a close friend');
select set_config('request.jwt.claims', json_build_object('sub', '2a000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
insert into public.blocks(blocker_id, blocked_id) values ('2a000000-0000-4000-8000-000000000005', '2a000000-0000-4000-8000-000000000001');
reset role;
select is((select count(*) from public.close_friends where friend_id = '2a000000-0000-4000-8000-000000000005'), 0::bigint, 'a block in either direction removes the membership');
select is((select count(*) from public.notifications where "senderId" = '2a000000-0000-4000-8000-000000000001'), 0::bigint, 'removing a close friend sends no notification');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '2a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
select throws_ok($$insert into public.close_friends(owner_id, friend_id) values ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000005')$$, '42501', null, 'a blocked user cannot be re-added');
select is((select count(*) from public.search_close_friend_candidates('Blake')), 0::bigint, 'blocked users are not offered as candidates');

set local role anon;
select throws_ok($$select count(*) from public.close_friends$$, '42501', null, 'anonymous access is denied');
select finish();
rollback;

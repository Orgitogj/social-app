begin;
select plan(38);

select has_table('public', 'stories', 'stories table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.stories'::regclass), 'stories have row level security');
select ok(not has_table_privilege('authenticated', 'public.stories', 'INSERT'), 'stories cannot be inserted directly');
select ok(not has_column_privilege('authenticated', 'public.stories', 'expires_at', 'UPDATE'), 'clients cannot update expiry');
select ok(not has_column_privilege('authenticated', 'public.stories', 'author_id', 'UPDATE'), 'clients cannot update ownership');
select ok(not has_table_privilege('anon', 'public.stories', 'SELECT'), 'anonymous clients cannot read stories');
select ok(not has_function_privilege('authenticated', 'private.owned_story_object(text, boolean)', 'execute'), 'story upload ownership checks are not callable by clients');

-- Author: Ava (private account). Followers: Cole (close friend), Nora (follower), Ezra (later blocked).
-- Pia has a pending follow request. Sid is a stranger.
insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('3a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'st-ava@example.test', '{}'::jsonb, '{"name":"Ava"}'::jsonb, now(), now()),
  ('3a000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'st-cole@example.test', '{}'::jsonb, '{"name":"Cole"}'::jsonb, now(), now()),
  ('3a000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'st-nora@example.test', '{}'::jsonb, '{"name":"Nora"}'::jsonb, now(), now()),
  ('3a000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'st-sid@example.test', '{}'::jsonb, '{"name":"Sid"}'::jsonb, now(), now()),
  ('3a000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'st-ezra@example.test', '{}'::jsonb, '{"name":"Ezra"}'::jsonb, now(), now()),
  ('3a000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'st-pia@example.test', '{}'::jsonb, '{"name":"Pia"}'::jsonb, now(), now());
update public.users set is_private = true where id = '3a000000-0000-4000-8000-000000000001';
insert into storage.objects(bucket_id, name, owner, metadata) values
  ('uploads', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000001/media.jpg', '3a000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}'),
  ('uploads', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000002/media.mp4', '3a000000-0000-4000-8000-000000000001', '{"size": 4096, "mimetype": "video/mp4"}'),
  ('uploads', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000002/thumbnail.jpg', '3a000000-0000-4000-8000-000000000001', '{"size": 512, "mimetype": "image/jpeg"}'),
  ('uploads', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000003/media.png', '3a000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/png"}'),
  ('uploads', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-00000000000a/media.jpg', '3a000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}'),
  ('uploads', '3a000000-0000-4000-8000-000000000004/stories/5a000000-0000-4000-8000-000000000009/media.jpg', '3a000000-0000-4000-8000-000000000004', '{"size": 2048, "mimetype": "image/jpeg"}');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('3a000000-0000-4000-8000-000000000002', '3a000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('3a000000-0000-4000-8000-000000000003', '3a000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('3a000000-0000-4000-8000-000000000005', '3a000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000006', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('3a000000-0000-4000-8000-000000000006', '3a000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
update public.follows set status = 'accepted' where following_id = '3a000000-0000-4000-8000-000000000001' and follower_id <> '3a000000-0000-4000-8000-000000000006';
insert into public.close_friends(owner_id, friend_id) values ('3a000000-0000-4000-8000-000000000001', '3a000000-0000-4000-8000-000000000002');

-- Publishing.
select lives_ok($$select public.create_story('5a000000-0000-4000-8000-000000000001', 'image', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000001/media.jpg', 'image/jpeg', 1080, 1920, null, null, '  Hello  ', 'followers')$$, 'the author can publish a followers story');
select lives_ok($$select public.create_story('5a000000-0000-4000-8000-000000000002', 'video', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000002/media.mp4', 'video/mp4', 1080, 1920, 12.5, '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000002/thumbnail.jpg', null, 'close_friends')$$, 'the author can publish a close friends video story');
select lives_ok($$select public.create_story('5a000000-0000-4000-8000-000000000003', 'image', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000003/media.png', 'image/png', 1080, 1920)$$, 'the author can publish a story with default audience');
select is((select public.create_story('5a000000-0000-4000-8000-000000000001', 'image', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000001/media.jpg', 'image/jpeg', 1080, 1920)->>'id'), '5a000000-0000-4000-8000-000000000001', 'republishing the same story id is idempotent');
select is((select count(*) from public.stories), 3::bigint, 'idempotent retries do not duplicate stories');
select is((select caption from public.stories where id = '5a000000-0000-4000-8000-000000000001'), 'Hello', 'captions are normalized server-side');
select ok((select bool_and(created_at = now() and expires_at = now() + interval '24 hours') from public.stories), 'the database sets a 24 hour lifetime from its own clock');
select throws_ok($$select public.create_story('5a000000-0000-4000-8000-000000000004', 'image', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000004/media.jpg', 'image/jpeg', 1080, 1920, null, null, null, 'everyone')$$, '23514', 'Invalid story options', 'unsupported audiences are rejected');
select throws_ok($$select public.create_story('5a000000-0000-4000-8000-000000000004', 'image', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000004/media.jpg', 'image/jpeg', 1080, 1920)$$, '42501', 'Upload is unavailable or not owned by you', 'a story requires an uploaded object');
select throws_ok($$select public.create_story('5a000000-0000-4000-8000-000000000004', 'image', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000001/media.jpg', 'image/jpeg', 1080, 1920)$$, '23514', null, 'a story cannot reuse another story''s media');
select throws_ok($$select public.create_story('5a000000-0000-4000-8000-00000000000a', 'image', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-00000000000a/media.jpg', 'image/png', 1080, 1920)$$, '42501', null, 'declared media must match the uploaded object');
select is((select count(*) from public.get_active_stories('3a000000-0000-4000-8000-000000000001')), 3::bigint, 'the author can access their active stories');

-- Visibility by relationship.
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*) from public.get_active_stories('3a000000-0000-4000-8000-000000000001')), 3::bigint, 'a close friend sees followers and close friends stories');
select is((select count(*) from public.stories where id = '5a000000-0000-4000-8000-000000000002'), 1::bigint, 'a close friend can open a close friends story');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((select count(*) from public.get_active_stories('3a000000-0000-4000-8000-000000000001')), 2::bigint, 'a follower sees only followers stories');
select is((select count(*) from public.stories where id = '5a000000-0000-4000-8000-000000000002'), 0::bigint, 'a known close friends story id does not bypass membership');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000004', 'role', 'authenticated')::text, true);
select is((select count(*) from public.stories where author_id = '3a000000-0000-4000-8000-000000000001'), 0::bigint, 'a stranger cannot read a private account''s stories');
select is((select count(*) from public.stories where id = '5a000000-0000-4000-8000-000000000001'), 0::bigint, 'a guessed story id does not bypass row level security');
select throws_ok($$select public.create_story('5a000000-0000-4000-8000-000000000001', 'image', '3a000000-0000-4000-8000-000000000004/stories/5a000000-0000-4000-8000-000000000009/media.jpg', 'image/jpeg', 1080, 1920)$$, '42501', 'Story is unavailable', 'another user''s story id cannot be claimed');
select throws_ok($$select public.create_story('5a000000-0000-4000-8000-000000000005', 'image', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000005/media.jpg', 'image/jpeg', 1080, 1920)$$, '42501', null, 'a user cannot publish into another account''s media');
select lives_ok($$select public.create_story('5a000000-0000-4000-8000-000000000009', 'image', '3a000000-0000-4000-8000-000000000004/stories/5a000000-0000-4000-8000-000000000009/media.jpg', 'image/jpeg', 1080, 1920)$$, 'any account publishes only as itself');
select is((select author_id::text from public.stories where id = '5a000000-0000-4000-8000-000000000009'), '3a000000-0000-4000-8000-000000000004', 'the author is always the caller');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000006', 'role', 'authenticated')::text, true);
select is((select count(*) from public.get_active_stories('3a000000-0000-4000-8000-000000000001')), 0::bigint, 'a pending follow request grants no access');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
select is((select count(*) from public.get_active_stories('3a000000-0000-4000-8000-000000000001')), 2::bigint, 'an accepted follower sees followers stories before a block');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
insert into public.blocks(blocker_id, blocked_id) values ('3a000000-0000-4000-8000-000000000001', '3a000000-0000-4000-8000-000000000005');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
select is((select count(*) from public.stories where author_id = '3a000000-0000-4000-8000-000000000001'), 0::bigint, 'a blocked user cannot access stories');

-- Mutations by other users.
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
update public.stories set caption = 'Hijacked' where id = '5a000000-0000-4000-8000-000000000001';
delete from public.stories where id = '5a000000-0000-4000-8000-000000000001';
select throws_ok($$insert into public.stories(id, author_id, media_type, media_path, mime_type, width, height, expires_at) values ('5a000000-0000-4000-8000-000000000008', '3a000000-0000-4000-8000-000000000001', 'image', '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000008/media.jpg', 'image/jpeg', 1, 1, now() + interval '1 year')$$, '42501', null, 'a user cannot insert a story row directly');
reset role;
select is((select caption from public.stories where id = '5a000000-0000-4000-8000-000000000001'), 'Hello', 'a user cannot update another user''s story');
select is((select count(*) from public.stories where id = '5a000000-0000-4000-8000-000000000001'), 1::bigint, 'a user cannot delete another user''s story');

-- Access follows relationship changes, and deletion queues media cleanup.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
delete from public.close_friends where friend_id = '3a000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*) from public.stories where id = '5a000000-0000-4000-8000-000000000002'), 0::bigint, 'removal from close friends revokes access immediately');
delete from public.follows where follower_id = '3a000000-0000-4000-8000-000000000002';
select is((select count(*) from public.stories where author_id = '3a000000-0000-4000-8000-000000000001'), 0::bigint, 'unfollowing revokes followers story access');
select set_config('request.jwt.claims', json_build_object('sub', '3a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
delete from public.stories where id = '5a000000-0000-4000-8000-000000000002';
reset role;
select is((select count(*) from private.storage_cleanup where path like '3a000000-0000-4000-8000-000000000001/stories/5a000000-0000-4000-8000-000000000002/%'), 2::bigint, 'deleting a story queues its media and thumbnail for cleanup');
select finish();
rollback;

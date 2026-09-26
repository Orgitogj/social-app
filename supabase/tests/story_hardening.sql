begin;
select plan(37);

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('ae000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'hd-ava@example.test', '{}'::jsonb, '{"name":"Ava"}'::jsonb, now(), now()),
  ('ae000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'hd-cole@example.test', '{}'::jsonb, '{"name":"Cole"}'::jsonb, now(), now()),
  ('ae000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'hd-nora@example.test', '{}'::jsonb, '{"name":"Nora"}'::jsonb, now(), now()),
  ('ae000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'hd-sid@example.test', '{}'::jsonb, '{"name":"Sid"}'::jsonb, now(), now()),
  ('ae000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'hd-ezra@example.test', '{}'::jsonb, '{"name":"Ezra"}'::jsonb, now(), now()),
  ('ae000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'hd-pia@example.test', '{}'::jsonb, '{"name":"Pia"}'::jsonb, now(), now()),
  ('ae000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'hd-bea@example.test', '{}'::jsonb, '{"name":"Bea"}'::jsonb, now(), now());
update public.users set is_private = true where id = 'ae000000-0000-4000-8000-000000000001';
update public.notification_preferences set push_enabled = true, message_previews = false where "userId" = 'ae000000-0000-4000-8000-000000000001';
insert into public.push_tokens("userId", device_id, token, platform) values ('ae000000-0000-4000-8000-000000000001', gen_random_uuid(), 'ExponentPushToken[hdava]', 'android');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('ae000000-0000-4000-8000-000000000002', 'ae000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('ae000000-0000-4000-8000-000000000003', 'ae000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('ae000000-0000-4000-8000-000000000005', 'ae000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000006', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('ae000000-0000-4000-8000-000000000006', 'ae000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
update public.follows set status = 'accepted' where following_id = 'ae000000-0000-4000-8000-000000000001' and follower_id <> 'ae000000-0000-4000-8000-000000000006';
insert into public.close_friends(owner_id, friend_id) values ('ae000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000002');
insert into public.blocks(blocker_id, blocked_id) values ('ae000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000005');
reset role;

insert into public.stories(id, author_id, media_type, media_path, mime_type, width, height, audience, expires_at) values
  ('be000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000001', 'image', 'ae000000-0000-4000-8000-000000000001/stories/be000000-0000-4000-8000-000000000001/media.jpg', 'image/jpeg', 1, 1, 'followers', now()),
  ('be000000-0000-4000-8000-000000000002', 'ae000000-0000-4000-8000-000000000001', 'image', 'ae000000-0000-4000-8000-000000000001/stories/be000000-0000-4000-8000-000000000002/media.jpg', 'image/jpeg', 1, 1, 'close_friends', now()),
  ('be000000-0000-4000-8000-000000000003', 'ae000000-0000-4000-8000-000000000001', 'image', 'ae000000-0000-4000-8000-000000000001/stories/be000000-0000-4000-8000-000000000003/media.jpg', 'image/jpeg', 1, 1, 'followers', now()),
  ('be000000-0000-4000-8000-000000000004', 'ae000000-0000-4000-8000-000000000001', 'image', 'ae000000-0000-4000-8000-000000000001/stories/be000000-0000-4000-8000-000000000004/media.jpg', 'image/jpeg', 1, 1, 'followers', now()),
  ('be000000-0000-4000-8000-000000000005', 'ae000000-0000-4000-8000-000000000007', 'image', 'ae000000-0000-4000-8000-000000000007/stories/be000000-0000-4000-8000-000000000005/media.jpg', 'image/jpeg', 1, 1, 'close_friends', now());
alter table public.stories disable trigger story_lifecycle;
update public.stories set created_at = now() - interval '24 hours', expires_at = now() where id = 'be000000-0000-4000-8000-000000000003';
update public.stories set created_at = now() - interval '30 hours', expires_at = now() - interval '6 hours' where id = 'be000000-0000-4000-8000-000000000004';
alter table public.stories enable trigger story_lifecycle;
insert into public.story_views(story_id, viewer_id) values ('be000000-0000-4000-8000-000000000004', 'ae000000-0000-4000-8000-000000000003');

create temporary table visibility_matrix(viewer uuid, story uuid, via_policy boolean) on commit drop;
grant insert, select on visibility_matrix to authenticated;
do $$
declare viewer uuid; story uuid;
begin
  foreach viewer in array array['ae000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000002', 'ae000000-0000-4000-8000-000000000003', 'ae000000-0000-4000-8000-000000000004', 'ae000000-0000-4000-8000-000000000005', 'ae000000-0000-4000-8000-000000000006', 'ae000000-0000-4000-8000-000000000007']::uuid[] loop
    perform set_config('request.jwt.claims', json_build_object('sub', viewer, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    foreach story in array array['be000000-0000-4000-8000-000000000001', 'be000000-0000-4000-8000-000000000002', 'be000000-0000-4000-8000-000000000003', 'be000000-0000-4000-8000-000000000004', 'be000000-0000-4000-8000-000000000005']::uuid[] loop
      insert into visibility_matrix values (viewer, story, exists(select 1 from public.stories where id = story));
    end loop;
    execute 'reset role';
  end loop;
end;
$$;
select is((select count(*) from visibility_matrix), 35::bigint, 'the visibility matrix covers every viewer and story');
select is((select count(*) from visibility_matrix where via_policy <> private.story_visible_to(story, viewer)), 0::bigint, 'the set-based row policy matches the single visibility rule for every viewer and story');
select is((select count(*) from visibility_matrix where via_policy and viewer = 'ae000000-0000-4000-8000-000000000005' and story::text like 'be000000-0000-4000-8000-00000000000%' and story <> 'be000000-0000-4000-8000-000000000005'), 0::bigint, 'a blocked follower sees none of the author''s stories');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((select count(*) from private.story_close_friend_owners()), 0::bigint, 'the close friends helper reveals nothing to non-members');
select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select array_agg(o) from private.story_close_friend_owners() o), array['ae000000-0000-4000-8000-000000000001'::uuid], 'the close friends helper only returns owners with active close friends stories for the caller');
select is(public.get_story('be000000-0000-4000-8000-000000000003'), null, 'a story is inactive exactly at its expiry instant');
select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*) from public.get_story_viewers('be000000-0000-4000-8000-000000000004')), 1::bigint, 'an author keeps the viewer list during the retention window');
select is((select count(*) from public.stories where id = 'be000000-0000-4000-8000-000000000004'), 1::bigint, 'an author can still read an expired story before purge');

select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((public.send_story_interaction('be000000-0000-4000-8000-000000000001', 'ce000000-0000-4000-8000-000000000001', 'reaction', '❤️')->>'message_type'), 'story_reaction', 'heart reactions are accepted');
select lives_ok($$select public.send_story_interaction('be000000-0000-4000-8000-000000000001', 'ce000000-0000-4000-8000-000000000002', 'reaction', '😂')$$, 'laugh reactions are accepted');
select lives_ok($$select public.send_story_interaction('be000000-0000-4000-8000-000000000001', 'ce000000-0000-4000-8000-000000000003', 'reaction', '😮')$$, 'wow reactions are accepted');
select lives_ok($$select public.send_story_interaction('be000000-0000-4000-8000-000000000001', 'ce000000-0000-4000-8000-000000000004', 'reaction', '😢')$$, 'sad reactions are accepted');
select lives_ok($$select public.send_story_interaction('be000000-0000-4000-8000-000000000001', 'ce000000-0000-4000-8000-000000000005', 'reaction', '🔥')$$, 'fire reactions are accepted');
select lives_ok($$select public.send_story_interaction('be000000-0000-4000-8000-000000000001', 'ce000000-0000-4000-8000-000000000006', 'reaction', '👍')$$, 'like reactions are accepted');
select lives_ok($$select public.send_story_interaction('be000000-0000-4000-8000-000000000001', 'ce000000-0000-4000-8000-000000000007', 'reply', 'Nice')$$, 'a reply after reactions is accepted');
select is((select count(distinct conversation_id) from public.messages where story_id = 'be000000-0000-4000-8000-000000000001'), 1::bigint, 'every interaction with one author reuses one conversation');
reset role;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
select is((select bool_and(not message_previews) from public.claim_push_jobs(100) c where c.token = 'ExponentPushToken[hdava]'), true, 'hidden message previews are passed to the dispatcher for story interactions');

insert into public.posts(id, "userId", body, visibility, status) values ('fe000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000001', 'Hello followers', 'followers', 'published');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ae000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select lives_ok($$select public.set_story_mute('ae000000-0000-4000-8000-000000000001', true)$$, 'stories can be muted');
select is((select count(*) from public.get_feed('following') p where p->>'id' = 'fe000000-0000-4000-8000-000000000001'), 1::bigint, 'a story mute leaves the author''s posts in the feed');
select lives_ok($$select public.set_story_mute('ae000000-0000-4000-8000-000000000001', false)$$, 'stories can be unmuted');
insert into public.mutes("userId", muted_id) values ('ae000000-0000-4000-8000-000000000003', 'ae000000-0000-4000-8000-000000000001');
select is((select count(*) from public.get_feed('following') p where p->>'id' = 'fe000000-0000-4000-8000-000000000001'), 0::bigint, 'a post mute still hides the author''s posts');
select is((select (t->>'muted')::boolean from public.get_story_tray() t where t->'author'->>'id' = 'ae000000-0000-4000-8000-000000000001'), false, 'a post mute does not mute stories');
reset role;

insert into storage.objects(bucket_id, name, owner, metadata, created_at)
select 'uploads', 'ae000000-0000-4000-8000-000000000007/stories/' || gen_random_uuid() || '/media.jpg', 'ae000000-0000-4000-8000-000000000007', '{"size": 10, "mimetype": "image/jpeg"}', now() - interval '2 days' from generate_series(1, 150);
delete from private.cleanup_cursors;
select ok(private.queue_orphan_story_media(100) > 0, 'a bounded orphan scan queues part of the bucket');
select ok((select position <> '' from private.cleanup_cursors where name = 'orphan_story_media'), 'the orphan scan resumes where it stopped');
select ok(private.queue_orphan_story_media(100) >= 0, 'the next scan continues from the cursor');
select ok((select position = '' from private.cleanup_cursors where name = 'orphan_story_media'), 'the orphan scan wraps after reaching the end');
select ok((select count(*) >= 150 from private.storage_cleanup where path like 'ae000000-0000-4000-8000-000000000007/stories/%'), 'every orphan is queued across scans');

insert into private.storage_cleanup(path) values ('ae000000-0000-4000-8000-000000000007/stuck.jpg');
update private.storage_cleanup set attempts = 5 where path = 'ae000000-0000-4000-8000-000000000007/stuck.jpg';
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
select ok(not exists(select 1 from public.claim_storage_cleanup(500) c where c.path = 'ae000000-0000-4000-8000-000000000007/stuck.jpg'), 'objects past the retry limit are not claimed again');
select ok((select failed_at is not null from private.storage_cleanup where path = 'ae000000-0000-4000-8000-000000000007/stuck.jpg'), 'objects past the retry limit are parked as failed');
select is((select count(*) from public.claim_storage_cleanup(3)), 0::bigint, 'claimed objects are not handed out twice while in flight');

alter table public.stories disable trigger story_lifecycle;
update public.stories set created_at = now() - interval '80 hours', expires_at = now() - interval '56 hours' where id in ('be000000-0000-4000-8000-000000000001', 'be000000-0000-4000-8000-000000000004');
alter table public.stories enable trigger story_lifecycle;
select is(private.purge_expired_stories(1), 1, 'purging respects the batch size');
select is(private.purge_expired_stories(1), 1, 'the next batch continues the purge');
select is((select count(*) from public.story_views where story_id = 'be000000-0000-4000-8000-000000000004'), 0::bigint, 'purged stories remove their view history');

set local session_replication_role = replica;
update public.users set image = 'ae000000-0000-4000-8000-000000000006/avatar.jpg' where id = 'ae000000-0000-4000-8000-000000000006';
set local session_replication_role = origin;
select lives_ok($$update public.users set image = null where id = 'ae000000-0000-4000-8000-000000000006'$$, 'changing a profile picture queues the old image without failing');
select lives_ok($$delete from auth.users where id = 'ae000000-0000-4000-8000-000000000007'$$, 'deleting an account succeeds');
select ok(exists(select 1 from private.storage_cleanup where path = 'ae000000-0000-4000-8000-000000000007/stories/be000000-0000-4000-8000-000000000005/media.jpg'), 'account deletion queues the author''s story media');
select is((select count(*) from public.stories where author_id = 'ae000000-0000-4000-8000-000000000007'), 0::bigint, 'account deletion removes the author''s stories');
select finish();
rollback;

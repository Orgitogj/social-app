begin;
select plan(73);

select ok(exists(select 1 from cron.job where jobname = 'linkup-story-cleanup'), 'story cleanup is scheduled');
select ok(exists(select 1 from cron.job where jobname = 'linkup-storage-cleanup'), 'storage cleanup is scheduled');
select ok((select schedule from cron.job where jobname = 'linkup-story-cleanup') = '17 * * * *', 'story cleanup runs hourly');
select ok(not has_function_privilege('authenticated', 'public.claim_storage_cleanup(integer)', 'execute'), 'clients cannot claim storage cleanup');
select ok(not has_function_privilege('authenticated', 'public.complete_storage_cleanup(text[], text[], text)', 'execute'), 'clients cannot complete storage cleanup');
select ok(not has_function_privilege('authenticated', 'private.purge_expired_stories(integer)', 'execute'), 'clients cannot purge stories');
select ok(not has_function_privilege('anon', 'public.get_story(uuid)', 'execute'), 'anonymous clients cannot resolve stories');

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('ad000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'lc-ava@example.test', '{}'::jsonb, '{"name":"Ava"}'::jsonb, now(), now()),
  ('ad000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'lc-cole@example.test', '{}'::jsonb, '{"name":"Cole"}'::jsonb, now(), now()),
  ('ad000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'lc-nora@example.test', '{}'::jsonb, '{"name":"Nora"}'::jsonb, now(), now()),
  ('ad000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'lc-sid@example.test', '{}'::jsonb, '{"name":"Sid"}'::jsonb, now(), now()),
  ('ad000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'lc-ezra@example.test', '{}'::jsonb, '{"name":"Ezra"}'::jsonb, now(), now()),
  ('ad000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'lc-pia@example.test', '{}'::jsonb, '{"name":"Pia"}'::jsonb, now(), now());
update public.users set is_private = true where id = 'ad000000-0000-4000-8000-000000000001';
update public.users set username = 'lc_cole' where id = 'ad000000-0000-4000-8000-000000000002';
update public.users set username = 'lc_nora' where id = 'ad000000-0000-4000-8000-000000000003';
update public.notification_preferences set push_enabled = true where "userId" in ('ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000003');
insert into public.push_tokens("userId", device_id, token, platform) values
  ('ad000000-0000-4000-8000-000000000001', gen_random_uuid(), 'ExponentPushToken[lcava]', 'android'),
  ('ad000000-0000-4000-8000-000000000003', gen_random_uuid(), 'ExponentPushToken[lcnora]', 'android');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('ad000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('ad000000-0000-4000-8000-000000000003', 'ad000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('ad000000-0000-4000-8000-000000000005', 'ad000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000006', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('ad000000-0000-4000-8000-000000000006', 'ad000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
update public.follows set status = 'accepted' where following_id = 'ad000000-0000-4000-8000-000000000001' and follower_id <> 'ad000000-0000-4000-8000-000000000006';
insert into public.close_friends(owner_id, friend_id) values ('ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000002');
reset role;

insert into public.stories(id, author_id, media_type, media_path, mime_type, width, height, caption, audience, expires_at) values
  ('bd000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', 'image', 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000001/media.jpg', 'image/jpeg', 1080, 1920, 'Hi @lc_cole and @lc_nora', 'followers', now()),
  ('bd000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000001', 'image', 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000002/media.jpg', 'image/jpeg', 1080, 1920, null, 'close_friends', now()),
  ('bd000000-0000-4000-8000-000000000003', 'ad000000-0000-4000-8000-000000000001', 'image', 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000003/media.jpg', 'image/jpeg', 1080, 1920, null, 'followers', now()),
  ('bd000000-0000-4000-8000-000000000004', 'ad000000-0000-4000-8000-000000000001', 'image', 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000004/media.jpg', 'image/jpeg', 1080, 1920, 'Old @lc_nora', 'followers', now());
insert into storage.objects(bucket_id, name, owner, metadata, created_at) values
  ('uploads', 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000001/media.jpg', 'ad000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}', now() - interval '3 days'),
  ('uploads', 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-0000000000aa/media.jpg', 'ad000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}', now() - interval '2 days'),
  ('uploads', 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-0000000000bb/media.jpg', 'ad000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}', now() - interval '1 hour'),
  ('uploads', 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000001/thumbnail.jpg', 'ad000000-0000-4000-8000-000000000001', '{"size": 512, "mimetype": "image/jpeg"}', now() - interval '3 days');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select lives_ok($$select public.send_story_interaction('bd000000-0000-4000-8000-000000000004', 'cd000000-0000-4000-8000-000000000001', 'reply', 'Great shot')$$, 'a follower replies to a story before it expires');
select lives_ok($$select public.send_story_interaction('bd000000-0000-4000-8000-000000000001', 'cd000000-0000-4000-8000-000000000002', 'reaction', '🔥')$$, 'a follower reacts to a story');
reset role;

select is((select count(*) from public.notifications where type = 'story_mention' and data->>'storyId' = 'bd000000-0000-4000-8000-000000000001'), 2::bigint, 'mentioned followers are notified once each');
select is((select count(*) from private.push_queue q join public.notifications n on n.id = q.notification_id where n.type = 'story_mention' and n."receiverId" = 'ad000000-0000-4000-8000-000000000003'), 2::bigint, 'story mentions enter the existing push queue only for push-enabled recipients');
select is((select count(*) from private.push_queue q join public.notifications n on n.id = q.notification_id where n."receiverId" = 'ad000000-0000-4000-8000-000000000002'), 0::bigint, 'recipients with push disabled are not queued');

select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
create temporary table claimed on commit drop as select * from public.claim_push_jobs(100);
select is((select data from claimed where notification_type = 'story_mention' and token = 'ExponentPushToken[lcnora]' and data->>'storyId' = 'bd000000-0000-4000-8000-000000000001'), jsonb_build_object('storyId', 'bd000000-0000-4000-8000-000000000001'), 'story mention push data carries only the story id');
select ok(not exists(select 1 from claimed where data::text like '%/stories/%' or data::text like '%token=%' or coalesce(message_preview, '') like '%/stories/%'), 'push payloads carry no media paths or signed urls');
select is((select message_preview from claimed c join public.messages m on m.id = (c.data->>'messageId')::uuid where m.client_id = 'cd000000-0000-4000-8000-000000000001'), 'Replied to your story: Great shot', 'story replies reuse the message push with a story preview');
select is((select message_preview from claimed c join public.messages m on m.id = (c.data->>'messageId')::uuid where m.client_id = 'cd000000-0000-4000-8000-000000000002'), 'Reacted 🔥 to your story', 'story reactions reuse the message push with a story preview');
select is((select count(*) from claimed where token = 'ExponentPushToken[lcava]' and notification_type = 'message'), 2::bigint, 'each story interaction produces exactly one push for the author');
select is((select count(*) from public.claim_push_jobs(100) c where c.notification_type in ('story_mention', 'message') and c.data->>'storyId' = 'bd000000-0000-4000-8000-000000000001'), 0::bigint, 'claimed story pushes are not claimed twice');

update public.stories set caption = 'Hi again @lc_nora @lc_nora' where id = 'bd000000-0000-4000-8000-000000000001';
select is((select count(*) from public.notifications where type = 'story_mention' and "receiverId" = 'ad000000-0000-4000-8000-000000000003' and data->>'storyId' = 'bd000000-0000-4000-8000-000000000001'), 1::bigint, 'caption edits and repeated mentions do not duplicate notifications');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((select public.get_story('bd000000-0000-4000-8000-000000000001')->>'id'), 'bd000000-0000-4000-8000-000000000001', 'an authorized active story resolves from a link');
select is(public.get_story('bd000000-0000-4000-8000-000000000002'), null, 'a close friends story does not resolve for a non close friend');
select is(public.get_story('bd000000-0000-4000-8000-0000000000ff'), null, 'a guessed story id does not resolve');
select is(public.get_story(null), null, 'a missing story id resolves to nothing');
select is((select count(*) from public.get_active_stories('ad000000-0000-4000-8000-000000000001') s where s->>'audience' = 'close_friends'), 0::bigint, 'profile stories do not reveal inaccessible close friends stories');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select public.get_story('bd000000-0000-4000-8000-000000000002')->>'audience'), 'close_friends', 'a close friend resolves a close friends story');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000006', 'role', 'authenticated')::text, true);
select is(public.get_story('bd000000-0000-4000-8000-000000000001'), null, 'a pending follower cannot resolve a private account story');
select is((select count(*) from public.get_active_stories('ad000000-0000-4000-8000-000000000001')), 0::bigint, 'a pending follower sees no profile stories');

select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is(public.set_story_mute('ad000000-0000-4000-8000-000000000001', true), true, 'a viewer can mute an author''s stories');
select is((select (t->>'muted')::boolean from public.get_story_tray() t where t->'author'->>'id' = 'ad000000-0000-4000-8000-000000000001'), true, 'muted authors are flagged in the tray');
select is((select count(*) from public.follows where follower_id = 'ad000000-0000-4000-8000-000000000003' and following_id = 'ad000000-0000-4000-8000-000000000001' and status = 'accepted'), 1::bigint, 'muting stories does not unfollow');
select is((select count(*) from public.blocks where blocker_id = 'ad000000-0000-4000-8000-000000000003'), 0::bigint, 'muting stories does not block');
select is((select (p->>'muted')::boolean from public.get_profile('ad000000-0000-4000-8000-000000000001') p), false, 'a story mute does not mute posts');
select is((select (p->>'stories_muted')::boolean from public.get_profile('ad000000-0000-4000-8000-000000000001') p), true, 'the profile reports the story mute to the viewer');
select is((select public.get_story('bd000000-0000-4000-8000-000000000001')->>'id'), 'bd000000-0000-4000-8000-000000000001', 'muted stories remain openable on purpose');
select throws_ok($$select public.set_story_mute('ad000000-0000-4000-8000-000000000003', true)$$, '42501', 'User is unavailable', 'a user cannot mute themselves');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
select is((select count(*) from public.mutes where muted_id = 'ad000000-0000-4000-8000-000000000001'), 0::bigint, 'the muted author cannot see the mute');
select is((select count(*) from public.notifications where "receiverId" = 'ad000000-0000-4000-8000-000000000001' and "senderId" = 'ad000000-0000-4000-8000-000000000003' and type not in ('message', 'follow', 'follow_request', 'follow_accepted')), 0::bigint, 'the muted author is not notified');
reset role;
insert into public.stories(id, author_id, media_type, media_path, mime_type, width, height, caption, audience, expires_at) values
  ('bd000000-0000-4000-8000-000000000005', 'ad000000-0000-4000-8000-000000000001', 'image', 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000005/media.jpg', 'image/jpeg', 1080, 1920, 'Look @lc_nora', 'followers', now());
select is((select count(*) from public.notifications where type = 'story_mention' and data->>'storyId' = 'bd000000-0000-4000-8000-000000000005'), 0::bigint, 'a muted author''s story mention does not notify');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is(public.set_story_mute('ad000000-0000-4000-8000-000000000001', false), false, 'a viewer can unmute stories');
select is((select count(*) from public.mutes where muted_id = 'ad000000-0000-4000-8000-000000000001'), 0::bigint, 'unmuting removes a stories-only mute');
insert into public.mutes("userId", muted_id) values ('ad000000-0000-4000-8000-000000000003', 'ad000000-0000-4000-8000-000000000001');
select is((select stories from public.mutes where muted_id = 'ad000000-0000-4000-8000-000000000001'), false, 'an existing post mute does not mute stories');
select lives_ok($$select public.set_story_mute('ad000000-0000-4000-8000-000000000001', true)$$, 'stories can be muted on top of a post mute');
select lives_ok($$select public.set_story_mute('ad000000-0000-4000-8000-000000000001', false)$$, 'stories can be unmuted while posts stay muted');
select is((select posts from public.mutes where muted_id = 'ad000000-0000-4000-8000-000000000001'), true, 'unmuting stories keeps the post mute');

select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
select is((select public.get_story('bd000000-0000-4000-8000-000000000001')->>'id'), 'bd000000-0000-4000-8000-000000000001', 'a follower resolves the story before a block');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
insert into public.blocks(blocker_id, blocked_id) values ('ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000005');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
select is(public.get_story('bd000000-0000-4000-8000-000000000001'), null, 'a blocked user cannot resolve a story link');
select is((select count(*) from public.get_story_tray()), 0::bigint, 'a blocked user has no tray entry for the author');
select is((select count(*) from public.get_active_stories('ad000000-0000-4000-8000-000000000001')), 0::bigint, 'a blocked user sees no profile stories');
select is((select count(*) from storage.objects where name like 'ad000000-0000-4000-8000-000000000001/stories/%'), 0::bigint, 'a blocked user cannot read story media');
select throws_ok($$select public.send_story_interaction('bd000000-0000-4000-8000-000000000001', 'cd000000-0000-4000-8000-000000000003', 'reaction', '❤️')$$, '42501', 'Story is unavailable', 'a blocked user cannot interact');
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
delete from public.blocks where blocked_id = 'ad000000-0000-4000-8000-000000000005';
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
select is(public.get_story('bd000000-0000-4000-8000-000000000001'), null, 'unblocking does not restore access without a new follow');
reset role;

alter table public.stories disable trigger story_lifecycle;
update public.stories set created_at = now() - interval '24 hours 1 second', expires_at = now() - interval '1 second' where id = 'bd000000-0000-4000-8000-000000000003';
update public.stories set created_at = now() - interval '73 hours', expires_at = now() - interval '49 hours' where id = 'bd000000-0000-4000-8000-000000000004';
alter table public.stories enable trigger story_lifecycle;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is(public.get_story('bd000000-0000-4000-8000-000000000003'), null, 'a story that expired a second ago by server time no longer resolves');
select ok(not exists(select 1 from public.get_active_stories('ad000000-0000-4000-8000-000000000001') s where s->>'id' = 'bd000000-0000-4000-8000-000000000003'), 'expired stories leave profile and viewer queries immediately');
select throws_ok($$select public.send_story_interaction('bd000000-0000-4000-8000-000000000003', 'cd000000-0000-4000-8000-000000000004', 'reply', 'Late')$$, '42501', 'Story is unavailable', 'an expired story cannot receive an interaction');
reset role;

select is(private.purge_expired_stories(), 1, 'only stories past the retention window are purged');
select is(private.purge_expired_stories(), 0, 'purging is idempotent');
select is((select count(*) from public.stories where id in ('bd000000-0000-4000-8000-000000000003', 'bd000000-0000-4000-8000-000000000001')), 2::bigint, 'recently expired and active stories are kept');
select ok(exists(select 1 from private.storage_cleanup where path = 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000004/media.jpg'), 'purged story media is queued for storage cleanup');
select is((select count(*) from public.notifications where type = 'story_mention' and data->>'storyId' = 'bd000000-0000-4000-8000-000000000004'), 0::bigint, 'purged story mention notifications are removed');
select is((select story_id from public.messages where client_id = 'cd000000-0000-4000-8000-000000000001'), null, 'purged stories detach from reply messages');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ad000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((select m->'story'->>'media_type' || ':' || (m->'story'->>'available') from public.get_message((select id from public.messages where client_id = 'cd000000-0000-4000-8000-000000000001')) m), 'image:false', 'historical story replies remain renderable after purge');
reset role;

select is(private.queue_orphan_story_media(), 2, 'unreferenced story media past the grace period is queued, including unused thumbnails');
select ok(exists(select 1 from private.storage_cleanup where path = 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-0000000000aa/media.jpg'), 'an unpublished upload is queued after the grace period');
select ok(not exists(select 1 from private.storage_cleanup where path like '%bd000000-0000-4000-8000-0000000000bb%'), 'a recent upload is left for an in-progress publish');
select ok(not exists(select 1 from private.storage_cleanup where path = 'ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000001/media.jpg'), 'referenced story media is never queued');
select is(private.queue_orphan_story_media(), 0, 'orphan queuing is idempotent');

insert into private.storage_cleanup(path) values ('../escape/media.jpg'), ('ad000000-0000-4000-8000-000000000001/stories/../../x.jpg');
select throws_ok($$select * from public.claim_storage_cleanup(10)$$, '42501', 'Service role required', 'cleanup claims require the service role');
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
create temporary table cleanup_claim on commit drop as select * from public.claim_storage_cleanup(500);
select ok(not exists(select 1 from cleanup_claim where path like '%..%'), 'unsafe paths are never handed to storage removal');
select is((select count(*) from private.storage_cleanup where failed_at is not null and last_error = 'Unsafe storage path'), 2::bigint, 'unsafe paths are parked as failed');
select lives_ok($$select public.complete_storage_cleanup(array['ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-0000000000aa/media.jpg'], array['ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-000000000004/media.jpg'], 'network')$$, 'cleanup results are recorded');
select ok(not exists(select 1 from private.storage_cleanup where path like '%bd000000-0000-4000-8000-0000000000aa%'), 'removed and missing objects leave the queue');
select ok((select next_attempt_at > now() and claimed_at is null from private.storage_cleanup where path like '%bd000000-0000-4000-8000-000000000004/media.jpg'), 'failed removals are retried later');
select lives_ok($$select public.complete_storage_cleanup(array['ad000000-0000-4000-8000-000000000001/stories/bd000000-0000-4000-8000-0000000000aa/media.jpg'])$$, 'completing an already removed path is harmless');
select finish();
rollback;

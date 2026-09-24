begin;
select plan(59);

select has_table('public', 'story_mentions', 'story mentions table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.story_mentions'::regclass), 'story mentions have row level security');
select ok(not has_table_privilege('authenticated', 'public.story_mentions', 'INSERT'), 'story mentions cannot be written directly');
select ok(not has_table_privilege('authenticated', 'public.messages', 'INSERT'), 'story messages cannot be inserted directly');
select ok(not has_function_privilege('authenticated', 'private.story_visible_to(uuid, uuid)', 'execute'), 'arbitrary visibility checks are not callable by clients');
select ok(not has_function_privilege('anon', 'public.send_story_interaction(uuid, uuid, text, text)', 'execute'), 'anonymous clients cannot interact with stories');
select is((select array_agg(t order by t) from private.extract_mentions('@Bob hi @bob @al @valid_name x@nomention') t), array['bob', 'valid_name'], 'the shared parser keeps valid, distinct usernames');

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('8c000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'si-ava@example.test', '{}'::jsonb, '{"name":"Ava"}'::jsonb, now(), now()),
  ('8c000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'si-cole@example.test', '{}'::jsonb, '{"name":"Cole"}'::jsonb, now(), now()),
  ('8c000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'si-nora@example.test', '{}'::jsonb, '{"name":"Nora"}'::jsonb, now(), now()),
  ('8c000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'si-sid@example.test', '{}'::jsonb, '{"name":"Sid"}'::jsonb, now(), now()),
  ('8c000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'si-ezra@example.test', '{}'::jsonb, '{"name":"Ezra"}'::jsonb, now(), now()),
  ('8c000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'si-bea@example.test', '{}'::jsonb, '{"name":"Bea"}'::jsonb, now(), now());
update public.users set is_private = true where id in ('8c000000-0000-4000-8000-000000000001', '8c000000-0000-4000-8000-000000000006');
update public.users set username = 'si_ava' where id = '8c000000-0000-4000-8000-000000000001';
update public.users set username = 'si_cole' where id = '8c000000-0000-4000-8000-000000000002';
update public.users set username = 'si_nora' where id = '8c000000-0000-4000-8000-000000000003';
update public.users set username = 'si_sid' where id = '8c000000-0000-4000-8000-000000000004';
update public.users set username = 'si_ezra' where id = '8c000000-0000-4000-8000-000000000005';
update public.user_private set allow_messages = false where id = '8c000000-0000-4000-8000-000000000006';

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('8c000000-0000-4000-8000-000000000002', '8c000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('8c000000-0000-4000-8000-000000000003', '8c000000-0000-4000-8000-000000000001'), ('8c000000-0000-4000-8000-000000000003', '8c000000-0000-4000-8000-000000000006');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('8c000000-0000-4000-8000-000000000005', '8c000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000006', 'role', 'authenticated')::text, true);
update public.follows set status = 'accepted' where following_id = '8c000000-0000-4000-8000-000000000006';
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
update public.follows set status = 'accepted' where following_id = '8c000000-0000-4000-8000-000000000001';
insert into public.close_friends(owner_id, friend_id) values ('8c000000-0000-4000-8000-000000000001', '8c000000-0000-4000-8000-000000000002');
reset role;

insert into public.stories(id, author_id, media_type, media_path, mime_type, thumbnail_path, width, height, duration, caption, audience, expires_at) values
  ('9c000000-0000-4000-8000-000000000001', '8c000000-0000-4000-8000-000000000001', 'image', '8c000000-0000-4000-8000-000000000001/stories/9c000000-0000-4000-8000-000000000001/media.jpg', 'image/jpeg', null, 1080, 1920, null, null, 'followers', now()),
  ('9c000000-0000-4000-8000-000000000002', '8c000000-0000-4000-8000-000000000001', 'video', '8c000000-0000-4000-8000-000000000001/stories/9c000000-0000-4000-8000-000000000002/media.mp4', 'video/mp4', '8c000000-0000-4000-8000-000000000001/stories/9c000000-0000-4000-8000-000000000002/thumbnail.jpg', 1080, 1920, 9, 'With @si_cole @si_nora @si_nora @SI_NORA @si_sid @ghost_user @si_ava', 'close_friends', now()),
  ('9c000000-0000-4000-8000-000000000003', '8c000000-0000-4000-8000-000000000006', 'image', '8c000000-0000-4000-8000-000000000006/stories/9c000000-0000-4000-8000-000000000003/media.jpg', 'image/jpeg', null, 1080, 1920, null, null, 'followers', now());

select is((select array_agg(user_id::text order by user_id) from public.story_mentions where story_id = '9c000000-0000-4000-8000-000000000002'),
  array['8c000000-0000-4000-8000-000000000002', '8c000000-0000-4000-8000-000000000003', '8c000000-0000-4000-8000-000000000004'], 'valid, distinct, non-self mentions are recorded once');
select is((select array_agg("receiverId"::text) from public.notifications where type = 'story_mention' and data->>'storyId' = '9c000000-0000-4000-8000-000000000002'),
  array['8c000000-0000-4000-8000-000000000002'], 'only mentioned users who can see a close friends story are notified');
select is((select title from public.notifications where type = 'story_mention' and "receiverId" = '8c000000-0000-4000-8000-000000000002'), 'mentioned you in their story', 'story mention notifications use the shared notification records');
select ok((select not (data::text like '%/stories/%') from public.notifications where type = 'story_mention' and "receiverId" = '8c000000-0000-4000-8000-000000000002'), 'notifications carry no media paths');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((select count(*) from public.stories where id = '9c000000-0000-4000-8000-000000000002'), 0::bigint, 'a mention does not grant access to a close friends story');
select is((select count(*) from public.story_mentions), 0::bigint, 'a mentioned user who cannot see the story cannot read the mention');
select throws_ok($$select public.mark_story_viewed('9c000000-0000-4000-8000-000000000002')$$, '42501', 'Story is unavailable', 'a mentioned non close friend cannot view the story');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*) from public.story_mentions), 1::bigint, 'an authorized mentioned user reads only their own mention');

select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
update public.stories set caption = 'Again @si_cole and @si_cole' where id = '9c000000-0000-4000-8000-000000000002';
select is((select count(*) from public.story_mentions), 1::bigint, 'the author reads the mentions of an edited caption');
reset role;
select is((select count(*) from public.notifications where type = 'story_mention' and "receiverId" = '8c000000-0000-4000-8000-000000000002'), 1::bigint, 'repeated mentions never duplicate notifications');

update public.notification_preferences set mentions = false where "userId" = '8c000000-0000-4000-8000-000000000003';
insert into public.stories(id, author_id, media_type, media_path, mime_type, width, height, caption, audience, expires_at) values
  ('9c000000-0000-4000-8000-000000000004', '8c000000-0000-4000-8000-000000000001', 'image', '8c000000-0000-4000-8000-000000000001/stories/9c000000-0000-4000-8000-000000000004/media.jpg', 'image/jpeg', 1080, 1920, 'Hi @si_nora', 'followers', now());
select is((select count(*) from public.story_mentions where story_id = '9c000000-0000-4000-8000-000000000004'), 1::bigint, 'mentions are recorded even when notifications are disabled');
select is((select count(*) from public.notifications where type = 'story_mention' and "receiverId" = '8c000000-0000-4000-8000-000000000003'), 0::bigint, 'mention preferences are respected');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is(public.mark_story_viewed('9c000000-0000-4000-8000-000000000001'), true, 'a follower records a view');
select is(public.mark_story_viewed('9c000000-0000-4000-8000-000000000001'), true, 'a repeated view succeeds');
select is((select (s->>'view_count') is null from public.get_active_stories('8c000000-0000-4000-8000-000000000001') s where s->>'id' = '9c000000-0000-4000-8000-000000000001'), true, 'viewers do not receive view counts');
select is((select count(*) from public.get_story_viewers('9c000000-0000-4000-8000-000000000001')), 0::bigint, 'a viewer cannot read a story''s viewer list');
select is((select count(*) from public.story_views where story_id = '9c000000-0000-4000-8000-000000000001'), 1::bigint, 'a viewer reads only their own view row');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is(public.mark_story_viewed('9c000000-0000-4000-8000-000000000001'), true, 'a second follower records a view');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000004', 'role', 'authenticated')::text, true);
select throws_ok($$select public.mark_story_viewed('9c000000-0000-4000-8000-000000000001')$$, '42501', 'Story is unavailable', 'an unauthorized user cannot record a view');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000006', 'role', 'authenticated')::text, true);
select is((select count(*) from public.get_story_viewers('9c000000-0000-4000-8000-000000000001')), 0::bigint, 'another author cannot read the viewer list');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
select is(public.mark_story_viewed('9c000000-0000-4000-8000-000000000001'), false, 'the author''s own view is not external');
select is((select (s->>'view_count')::int from public.get_active_stories('8c000000-0000-4000-8000-000000000001') s where s->>'id' = '9c000000-0000-4000-8000-000000000001'), 2, 'the author sees the unique viewer count');
select is((select count(*) from public.get_story_viewers('9c000000-0000-4000-8000-000000000001')), 2::bigint, 'the author reads the viewer list');
select is((select v->'viewer'->>'id' from public.get_story_viewers('9c000000-0000-4000-8000-000000000001', null, null, 1) v), '8c000000-0000-4000-8000-000000000003', 'viewer pages are ordered deterministically');
select is((select v->'viewer'->>'id' from public.get_story_viewers('9c000000-0000-4000-8000-000000000001', now(), '8c000000-0000-4000-8000-000000000003', 1) v), '8c000000-0000-4000-8000-000000000002', 'the viewer cursor returns the next page');
select is((select count(*) from public.get_story_viewers('9c000000-0000-4000-8000-000000000001', now(), '8c000000-0000-4000-8000-000000000002', 1)), 0::bigint, 'the viewer cursor ends after the last viewer');

select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((select s->>'can_reply' from public.get_active_stories('8c000000-0000-4000-8000-000000000001') s where s->>'id' = '9c000000-0000-4000-8000-000000000001'), 'true', 'stories report whether the viewer may reply');
select is((select s->>'can_reply' from public.get_active_stories('8c000000-0000-4000-8000-000000000006') s limit 1), 'false', 'stories of authors not accepting messages cannot be replied to');
select is((select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000001', 'reply', '  Looks amazing!  ')->>'message_type'), 'story_reply', 'a follower can reply to a story');
select is((select m->'story'->>'story_id' from public.get_message((select id from public.messages where client_id = 'ac000000-0000-4000-8000-000000000001')) m), '9c000000-0000-4000-8000-000000000001', 'the reply keeps its story context');
select is((select m->'story'->>'preview_path' from public.get_message((select id from public.messages where client_id = 'ac000000-0000-4000-8000-000000000001')) m), '8c000000-0000-4000-8000-000000000001/stories/9c000000-0000-4000-8000-000000000001/media.jpg', 'an active story exposes a preview to conversation members');
select is((select text from public.messages where client_id = 'ac000000-0000-4000-8000-000000000001'), 'Looks amazing!', 'reply text is trimmed');
select lives_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000001', 'reply', 'Looks amazing!')$$, 'a retried reply is idempotent');
select is((select count(*) from public.messages where story_id = '9c000000-0000-4000-8000-000000000001'), 1::bigint, 'a retry does not duplicate the reply');
select throws_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000002', 'reply', '   ')$$, '23514', 'Message cannot be empty', 'an empty reply is rejected');
select throws_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000002', 'ac000000-0000-4000-8000-000000000003', 'reply', 'Hi')$$, '42501', 'Story is unavailable', 'an inaccessible story cannot be replied to');
select throws_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000003', 'ac000000-0000-4000-8000-000000000004', 'reply', 'Hi')$$, '42501', 'Conversation is unavailable', 'a story reply cannot bypass messaging restrictions');
select throws_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000003', 'ac000000-0000-4000-8000-000000000005', 'reaction', '🔥')$$, '42501', 'Conversation is unavailable', 'a story reaction cannot bypass messaging restrictions');
select is((select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000006', 'reaction', '❤️')->>'message_type'), 'story_reaction', 'a follower can react to a story');
select is((select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000007', 'reaction', '❤️')->>'id'), (select id::text from public.messages where client_id = 'ac000000-0000-4000-8000-000000000006'), 'rapid repeated reactions collapse into one message');
select throws_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000008', 'reaction', '💩')$$, '23514', 'Unsupported reaction', 'unsupported reactions are rejected');
select throws_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000009', 'poke', 'x')$$, '23514', 'Invalid story interaction', 'unknown interactions are rejected');
reset role;
select is((select count(*) from public.notifications where "receiverId" = '8c000000-0000-4000-8000-000000000001' and "senderId" = '8c000000-0000-4000-8000-000000000003' and type = 'message'), 2::bigint, 'each story interaction creates exactly one message notification');
select is((select count(*) from public.notifications where "receiverId" = '8c000000-0000-4000-8000-000000000001' and "senderId" = '8c000000-0000-4000-8000-000000000003' and type not in ('message', 'follow', 'follow_request', 'follow_accepted')), 0::bigint, 'story interactions do not create a second notification type');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
select throws_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-00000000000a', 'reply', 'Mine')$$, '42501', 'Story is unavailable', 'an author cannot reply to their own story');
insert into public.blocks(blocker_id, blocked_id) values ('8c000000-0000-4000-8000-000000000001', '8c000000-0000-4000-8000-000000000005');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
select throws_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-00000000000b', 'reaction', '👍')$$, '42501', 'Story is unavailable', 'a blocked user cannot interact with a story');
select throws_ok($$select public.mark_story_viewed('9c000000-0000-4000-8000-000000000001')$$, '42501', 'Story is unavailable', 'a blocked user cannot record a view');

select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
delete from public.close_friends where friend_id = '8c000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*) from public.notifications where type = 'story_mention'), 1::bigint, 'the mention notification remains');
select is((select count(*) from public.stories where id = '9c000000-0000-4000-8000-000000000002'), 0::bigint, 'a notification does not bypass story access');

reset role;
alter table public.stories disable trigger story_lifecycle;
update public.stories set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' where id = '9c000000-0000-4000-8000-000000000001';
alter table public.stories enable trigger story_lifecycle;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select throws_ok($$select public.send_story_interaction('9c000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-00000000000c', 'reply', 'Late')$$, '42501', 'Story is unavailable', 'an expired story cannot be replied to');
select is((select (m->'story'->>'available')::boolean from public.get_message((select id from public.messages where client_id = 'ac000000-0000-4000-8000-000000000001')) m), false, 'an expired story reply stays renderable without media');
select set_config('request.jwt.claims', json_build_object('sub', '8c000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
delete from public.stories where id = '9c000000-0000-4000-8000-000000000001';
select is((select m->'story'->>'media_type' from public.get_message((select id from public.messages where client_id = 'ac000000-0000-4000-8000-000000000001')) m), 'image', 'a deleted story reply keeps its historical context for the author');
select finish();
rollback;

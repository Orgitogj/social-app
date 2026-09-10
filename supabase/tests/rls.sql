begin;
select plan(44);
select has_table('public', 'users', 'public profile table exists');
select has_table('public', 'user_private', 'private profile table exists');
select has_table('public', 'messages', 'messages table exists');
select has_table('public', 'message_reactions', 'message reactions table exists');
select has_table('public', 'message_hidden_for_users', 'per-user message deletion table exists');
select has_column('public', 'messages', 'reply_to_message_id', 'messages support replies');
select has_column('public', 'messages', 'deleted_at', 'messages are soft deleted');
select has_column('public', 'messages', 'client_id', 'messages support optimistic reconciliation');
select has_column('public', 'conversation_members', 'last_delivered_at', 'conversation delivery receipts exist');
select has_column('public', 'notification_preferences', 'message_previews', 'message preview preference exists');
select has_column('public', 'notification_preferences', 'follow_requests', 'follow-request preference exists');
select has_column('public', 'push_tokens', 'disabled_at', 'invalid push tokens can be disabled');
select has_column('private', 'push_queue', 'next_attempt_at', 'push jobs have a retry schedule');
select has_column('private', 'push_queue', 'failed_at', 'exhausted push jobs are retained as failed');
select ok(exists(select 1 from cron.job where jobname = 'linkup-push-dispatch-retry'), 'database cron dispatch recovery is installed');
select ok(exists(select 1 from cron.job where jobname = 'linkup-push-receipt-retry'), 'database cron receipt recovery is installed');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'message_reactions' and policyname = 'message_reactions_read'), 'only conversation members can read reactions');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'message_reactions' and policyname = 'message_reactions_create'), 'only a member can create a reaction');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'message_reactions' and policyname = 'message_reactions_update'), 'only a user can change their reaction');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'message_hidden_for_users' and policyname = 'message_hidden_read'), 'hidden messages remain private to their owner');
select has_table('public', 'reports', 'reports table exists');

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'phase1-alice@example.test', '{}'::jsonb, '{"name":"Alice"}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'phase1-bob@example.test', '{}'::jsonb, '{"name":"Bob"}'::jsonb, now(), now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'authenticated', 'authenticated', 'phase1-charlie@example.test', '{}'::jsonb, '{"name":"Charlie"}'::jsonb, now(), now());
insert into public.conversations(id, user_low, user_high) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into public.conversation_members(conversation_id, "userId") values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'role', 'authenticated')::text, true);
select lives_ok($$select public.send_message('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '10000000-0000-4000-8000-000000000001', 'First message')$$, 'a member can send a message');
select lives_ok($$select public.send_message('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '10000000-0000-4000-8000-000000000002', 'Second message')$$, 'a member can send a second message');
select is((select count(*) from public.get_messages('dddddddd-dddd-4ddd-8ddd-dddddddddddd', null, null, 1)), 1::bigint, 'message pagination returns the requested page size');
select lives_ok($$select public.send_message('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '10000000-0000-4000-8000-000000000003', 'Reply', null, null, (select id from public.messages where client_id = '10000000-0000-4000-8000-000000000001'))$$, 'a reply can reference a visible message');
select is((select public.get_message((select id from public.messages where client_id = '10000000-0000-4000-8000-000000000003'))->'reply_to'->>'id'), (select id::text from public.messages where client_id = '10000000-0000-4000-8000-000000000001'), 'reply query returns the referenced message');
select lives_ok($$select public.delete_message_for_everyone((select id from public.messages where client_id = '10000000-0000-4000-8000-000000000002'))$$, 'the sender can soft delete a message');
select ok((select (public.get_message((select id from public.messages where client_id = '10000000-0000-4000-8000-000000000002'))->>'deleted_at') is not null), 'soft-deleted messages remain auditable');
select lives_ok($$select public.set_message_reaction((select id from public.messages where client_id = '10000000-0000-4000-8000-000000000001'), '👍')$$, 'the sender can add their own reaction');

select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'role', 'authenticated')::text, true);
select lives_ok($$select public.set_message_reaction((select id from public.messages where client_id = '10000000-0000-4000-8000-000000000001'), '❤️')$$, 'a conversation member can react');
select is((select count(*) from public.message_reactions where message_id = (select id from public.messages where client_id = '10000000-0000-4000-8000-000000000001') and "userId" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 1::bigint, 'one reaction is stored per member and message');
update public.message_reactions set reaction = '🔥' where message_id = (select id from public.messages where client_id = '10000000-0000-4000-8000-000000000001') and "userId" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is((select reaction from public.message_reactions where message_id = (select id from public.messages where client_id = '10000000-0000-4000-8000-000000000001') and "userId" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), '👍', 'a user cannot modify another member reaction');
select lives_ok($$select public.mark_conversation_read('dddddddd-dddd-4ddd-8ddd-dddddddddddd', (select id from public.messages where client_id = '10000000-0000-4000-8000-000000000003'))$$, 'a participant can update their own read receipt');
select ok((select last_read_at is not null and last_delivered_at is not null from public.conversation_members where conversation_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and "userId" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'read receipts update only the viewer membership row');
update public.notification_preferences set messages = false where "userId" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'role', 'authenticated')::text, true);
select lives_ok($$select public.send_message('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '10000000-0000-4000-8000-000000000004', 'Muted notification')$$, 'message delivery still works when message push notifications are disabled');
select is((select count(*) from public.notifications where "receiverId" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and data->>'messageId' = (select id::text from public.messages where client_id = '10000000-0000-4000-8000-000000000004')), 0::bigint, 'server-side notification preferences suppress message notifications');
select lives_ok($$select public.register_push_token('11111111-1111-4111-8111-111111111111', 'ExpoPushToken[phase1_valid_token]', 'android')$$, 'a user can register their own device token');
set local role service_role;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
select lives_ok($$select public.complete_push_jobs(array[]::uuid[], '[]'::jsonb, array['ExpoPushToken[phase1_valid_token]'])$$, 'the trusted dispatcher can disable an invalid token');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'role', 'authenticated')::text, true);
select ok((select disabled_at is not null from public.push_tokens where token = 'ExpoPushToken[phase1_valid_token]'), 'an invalid push token is disabled');

set local role service_role;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
update public.notification_preferences set push_enabled = true where "userId" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
insert into public.notifications("senderId", "receiverId", type, title, data, dedupe_key)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'message', 'Retry bound test', '{}'::jsonb, 'phase1-push-retry-bound');
update private.push_queue set attempts = 5, next_attempt_at = now()
where notification_id = (select id from public.notifications where dedupe_key = 'phase1-push-retry-bound');
select is((select count(*) from public.claim_push_jobs(50) where notification_id = (select id from public.notifications where dedupe_key = 'phase1-push-retry-bound')), 0::bigint, 'a push job at the retry limit is not dispatched again');
select ok((select failed_at is not null from private.push_queue where notification_id = (select id from public.notifications where dedupe_key = 'phase1-push-retry-bound')), 'an exhausted push job is marked failed');
set local role authenticated;

select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'role', 'authenticated')::text, true);
select is((select count(*) from public.messages where conversation_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'), 0::bigint, 'an unrelated user cannot read another conversation');
select throws_ok($$select public.set_message_reaction((select id from public.messages where client_id = '10000000-0000-4000-8000-000000000001'), '❤️')$$, '42501', 'Message is unavailable', 'an unrelated user cannot react to an inaccessible message');

select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'role', 'authenticated')::text, true);
insert into public.blocks(blocker_id, blocked_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'role', 'authenticated')::text, true);
select throws_ok($$select public.send_message('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '10000000-0000-4000-8000-000000000005', 'Blocked message')$$, '42501', 'Conversation is unavailable', 'a blocked user cannot send a message');
select finish();
rollback;

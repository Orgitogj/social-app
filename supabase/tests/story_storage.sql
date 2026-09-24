begin;
select plan(28);

select ok(not (select public from storage.buckets where id = 'uploads'), 'story media is stored in a private bucket');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'uploads_story_create'), 'story uploads have a dedicated ownership policy');

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('4a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ss-mia@example.test', '{}'::jsonb, '{"name":"Mia"}'::jsonb, now(), now()),
  ('4a000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ss-leo@example.test', '{}'::jsonb, '{"name":"Leo"}'::jsonb, now(), now()),
  ('4a000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'ss-zoe@example.test', '{}'::jsonb, '{"name":"Zoe"}'::jsonb, now(), now()),
  ('4a000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'ss-kai@example.test', '{}'::jsonb, '{"name":"Kai"}'::jsonb, now(), now()),
  ('4a000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'ss-ben@example.test', '{}'::jsonb, '{"name":"Ben"}'::jsonb, now(), now());

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('4a000000-0000-4000-8000-000000000002', '4a000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('4a000000-0000-4000-8000-000000000003', '4a000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
insert into public.follows(follower_id, following_id) values ('4a000000-0000-4000-8000-000000000005', '4a000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
insert into public.close_friends(owner_id, friend_id) values ('4a000000-0000-4000-8000-000000000001', '4a000000-0000-4000-8000-000000000002');
select lives_ok($$insert into storage.objects(bucket_id, name, owner, metadata) values ('uploads', '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/media.mp4', '4a000000-0000-4000-8000-000000000001', '{"size": 4096, "mimetype": "video/mp4"}')$$, 'the author can upload story media');
select lives_ok($$insert into storage.objects(bucket_id, name, owner, metadata) values ('uploads', '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/thumbnail.jpg', '4a000000-0000-4000-8000-000000000001', '{"size": 512, "mimetype": "image/jpeg"}')$$, 'the author can upload a story thumbnail');
select lives_ok($$insert into storage.objects(bucket_id, name, owner, metadata) values ('uploads', '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000002/media.jpg', '4a000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}')$$, 'the author can upload a second story');
select lives_ok($$insert into storage.objects(bucket_id, name, owner, metadata) values ('uploads', '4a000000-0000-4000-8000-000000000001/6a000000-0000-4000-8000-0000000000ff.jpg', '4a000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}')$$, 'existing post and message uploads are unchanged');
select throws_ok($$insert into storage.objects(bucket_id, name, owner, metadata) values ('uploads', '4a000000-0000-4000-8000-000000000002/stories/6a000000-0000-4000-8000-000000000003/media.jpg', '4a000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}')$$, '42501', null, 'a user cannot upload into another user''s story namespace');
select throws_ok($$insert into storage.objects(bucket_id, name, owner, metadata) values ('uploads', '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000003/../../payload.jpg', '4a000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}')$$, '42501', null, 'arbitrary story filenames are rejected');
select throws_ok($$insert into storage.objects(bucket_id, name, owner, metadata) values ('uploads', '4a000000-0000-4000-8000-000000000001/stories/not-a-story/media.jpg', '4a000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}')$$, '42501', null, 'story folders must be story ids');
select lives_ok($$select public.create_story('6a000000-0000-4000-8000-000000000001', 'video', '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/media.mp4', 'video/mp4', 1080, 1920, 8, '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/thumbnail.jpg', null, 'close_friends')$$, 'the author can publish close friends media');
select lives_ok($$select public.create_story('6a000000-0000-4000-8000-000000000002', 'image', '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000002/media.jpg', 'image/jpeg', 1080, 1920)$$, 'the author can publish followers media');
select is((select count(*) from storage.objects where name like '4a000000-0000-4000-8000-000000000001/stories/%'), 3::bigint, 'the author can read their own story media');
select throws_ok($$select public.create_post('6a000000-0000-4000-8000-0000000000aa', '<p>Reuse</p>', 'public', 'published', '[{"type":"image","path":"4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000002/media.jpg","mime_type":"image/jpeg","width":1,"height":1,"size_bytes":2048}]'::jsonb)$$, '42501', null, 'story media cannot be republished as public post media');
select throws_ok($$update public.users set image = '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/thumbnail.jpg' where id = '4a000000-0000-4000-8000-000000000001'$$, '42501', null, 'story media cannot become a public avatar');

select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*) from storage.objects where name like '4a000000-0000-4000-8000-000000000001/stories/%'), 3::bigint, 'a close friend can read close friends media and thumbnails');
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((select count(*) from storage.objects where name = '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000002/media.jpg'), 1::bigint, 'a follower can read followers story media');
select is((select count(*) from storage.objects where name like '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/%'), 0::bigint, 'a non-close-friend cannot read close friends media by path');
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000004', 'role', 'authenticated')::text, true);
select is((select count(*) from storage.objects where name like '4a000000-0000-4000-8000-000000000001/%'), 0::bigint, 'a stranger cannot list or read story media');
select ok(not private.can_read_object('4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/media.mp4'), 'a guessed object path grants nothing');
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
insert into public.blocks(blocker_id, blocked_id) values ('4a000000-0000-4000-8000-000000000001', '4a000000-0000-4000-8000-000000000005');
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000005', 'role', 'authenticated')::text, true);
select is((select count(*) from storage.objects where name like '4a000000-0000-4000-8000-000000000001/stories/%'), 0::bigint, 'a blocked user cannot read story media');

select set_config('storage.allow_delete_query', 'true', true);
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
delete from storage.objects where name = '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/thumbnail.jpg';
reset role;
select is((select count(*) from storage.objects where name = '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/thumbnail.jpg'), 1::bigint, 'a viewer cannot delete story media');

alter table public.stories disable trigger story_lifecycle;
update public.stories set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' where id = '6a000000-0000-4000-8000-000000000002';
alter table public.stories enable trigger story_lifecycle;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select is((select count(*) from storage.objects where name = '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000002/media.jpg'), 0::bigint, 'expired story media is unreadable');

select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
insert into storage.objects(bucket_id, name, owner, metadata) values ('uploads', '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000004/media.jpg', '4a000000-0000-4000-8000-000000000001', '{"size": 2048, "mimetype": "image/jpeg"}');
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*) from storage.objects where name like '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000004/%'), 0::bigint, 'unpublished story uploads are private');

select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
delete from public.close_friends where friend_id = '4a000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
select is((select count(*) from storage.objects where name like '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000001/%'), 0::bigint, 'removed close friends lose media access');

select set_config('request.jwt.claims', json_build_object('sub', '4a000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
select lives_ok($$delete from storage.objects where name = '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000004/media.jpg'$$, 'the author can delete their story media');
select is((select count(*) from storage.objects where name = '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000004/media.jpg'), 0::bigint, 'an author delete removes the object');

set local role anon;
select is((select count(*) from storage.objects where name like '4a000000-0000-4000-8000-000000000001/stories/%'), 0::bigint, 'anonymous clients cannot read story media');
select throws_ok($$insert into storage.objects(bucket_id, name, metadata) values ('uploads', '4a000000-0000-4000-8000-000000000001/stories/6a000000-0000-4000-8000-000000000005/media.jpg', '{"size": 1, "mimetype": "image/jpeg"}')$$, '42501', null, 'anonymous clients cannot upload story media');
select finish();
rollback;

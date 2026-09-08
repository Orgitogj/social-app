begin;
select plan(4);
select has_table('public', 'users', 'public profile table exists');
select has_table('public', 'user_private', 'private profile table exists');
select has_table('public', 'messages', 'messages table exists');
select has_table('public', 'reports', 'reports table exists');
select finish();
rollback;

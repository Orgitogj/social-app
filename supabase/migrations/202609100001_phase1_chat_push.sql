-- Phase 1: production chat, receipts, device push management, and secure queries.
-- This migration deliberately extends the existing one-to-one model instead of adding
-- another conversation or notification system.

alter table public.conversation_members
  add column if not exists last_delivered_at timestamptz;

alter table public.messages
  add column if not exists client_id uuid,
  add column if not exists reply_to_message_id uuid,
  add column if not exists message_type text not null default 'text' check (message_type in ('text', 'image', 'video', 'audio', 'file', 'location')),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_sender boolean not null default false;

alter table public.messages
  add constraint messages_id_conversation_unique unique (id, conversation_id);
alter table public.messages
  add constraint messages_reply_in_same_conversation
  foreign key (reply_to_message_id, conversation_id)
  references public.messages(id, conversation_id)
  on delete restrict;

alter table public.messages drop constraint messages_check;
alter table public.messages add constraint messages_content_or_deleted
  check (deleted_at is not null or char_length(btrim(text)) > 0 or media_path is not null);

create unique index if not exists messages_sender_client_id
  on public.messages ("userId", client_id) where client_id is not null;
create index if not exists messages_reply_to on public.messages (reply_to_message_id) where reply_to_message_id is not null;

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  reaction text not null check (reaction in ('❤️', '👍', '😂', '😮', '😢', '🔥')),
  created_at timestamptz not null default now(),
  primary key (message_id, "userId")
);
create index message_reactions_message on public.message_reactions (message_id, reaction);

create table public.message_hidden_for_users (
  message_id uuid not null references public.messages(id) on delete cascade,
  "userId" uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, "userId")
);
create index message_hidden_for_user on public.message_hidden_for_users ("userId", message_id);

alter table public.notification_preferences
  add column if not exists replies boolean not null default true,
  add column if not exists follow_requests boolean not null default true,
  add column if not exists message_previews boolean not null default true;

alter table public.push_tokens
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists last_used_at timestamptz not null default now(),
  add column if not exists disabled_at timestamptz,
  add column if not exists failure_count integer not null default 0 check (failure_count >= 0);
create index if not exists push_tokens_active_user on public.push_tokens ("userId", updated_at desc) where disabled_at is null;

create table private.push_receipts (
  ticket_id text primary key,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  checked_at timestamptz,
  last_error text
);
create index push_receipts_pending on private.push_receipts (created_at) where checked_at is null;

alter table public.message_reactions enable row level security;
alter table public.message_hidden_for_users enable row level security;
revoke all on public.message_reactions, public.message_hidden_for_users from anon, authenticated;
create policy anon_denied on public.message_reactions for all to anon using (false) with check (false);
create policy anon_denied on public.message_hidden_for_users for all to anon using (false) with check (false);

grant select, delete on public.message_reactions to authenticated;
grant insert (message_id, "userId", reaction) on public.message_reactions to authenticated;
grant update (reaction) on public.message_reactions to authenticated;
create policy message_reactions_read on public.message_reactions for select to authenticated
  using (exists(select 1 from public.messages m where m.id = message_id and private.is_member(m.conversation_id)));
create policy message_reactions_create on public.message_reactions for insert to authenticated
  with check ("userId" = (select auth.uid()) and exists(select 1 from public.messages m where m.id = message_id and private.is_member(m.conversation_id) and m.deleted_at is null));
create policy message_reactions_update on public.message_reactions for update to authenticated
  using ("userId" = (select auth.uid()) and exists(select 1 from public.messages m where m.id = message_id and private.is_member(m.conversation_id) and m.deleted_at is null))
  with check ("userId" = (select auth.uid()) and exists(select 1 from public.messages m where m.id = message_id and private.is_member(m.conversation_id) and m.deleted_at is null));
create policy message_reactions_delete on public.message_reactions for delete to authenticated
  using ("userId" = (select auth.uid()));

grant select on public.message_hidden_for_users to authenticated;
create policy message_hidden_read on public.message_hidden_for_users for select to authenticated
  using ("userId" = (select auth.uid()) and exists(select 1 from public.messages m where m.id = message_id and private.is_member(m.conversation_id)));

-- Only RPCs mutate messages, receipts, and hidden-message state. The legacy RLS
-- still protects reads and remains the final authorization layer for every query.
revoke insert on public.messages from authenticated;
revoke update on public.messages from authenticated;
grant update (replies, follow_requests, message_previews, likes, comments, follows, mentions, messages, push_enabled) on public.notification_preferences to authenticated;

create or replace function private.validate_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is not null or new.deleted_by_sender then
    raise exception 'Messages must be created before they can be deleted' using errcode = '23514';
  end if;
  if new.message_type = 'text' and new.media_path is not null then
    raise exception 'Text messages cannot include media' using errcode = '23514';
  end if;
  if new.message_type = 'image' and (new.media_path is null or new.mime_type is null) then
    raise exception 'Image messages require an image upload' using errcode = '23514';
  end if;
  if new.message_type not in ('text', 'image') then
    raise exception 'This message type is not available yet' using errcode = '23514';
  end if;
  if new.media_path is not null and not private.owned_object(new.media_path, true) then
    raise exception 'Message upload is unavailable' using errcode = '42501';
  end if;
  if private.plain_text(new.text) = '' and new.media_path is null then
    raise exception 'Message cannot be empty' using errcode = '23514';
  end if;
  if new.reply_to_message_id is not null and not exists (
    select 1 from public.messages parent
    where parent.id = new.reply_to_message_id and parent.conversation_id = new.conversation_id
  ) then
    raise exception 'Reply is unavailable' using errcode = '42501';
  end if;
  if not exists(
    select 1 from public.conversation_members m
    join public.user_private p on p.id = m."userId"
    where m.conversation_id = new.conversation_id and m."userId" <> auth.uid() and p.allow_messages
  ) then
    raise exception 'This person is not accepting messages' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.emit_notification(sender uuid, receiver uuid, kind text, payload jsonb, key text) returns void
language plpgsql security definer set search_path = '' as $$
declare preferences public.notification_preferences; enabled boolean;
begin
  if sender is null or receiver is null or sender = receiver or private.blocked(sender, receiver) then return; end if;
  select * into preferences from public.notification_preferences where "userId" = receiver;
  enabled := case kind
    when 'like' then preferences.likes
    when 'comment' then preferences.comments
    when 'reply' then preferences.replies
    when 'mention' then preferences.mentions
    when 'message' then preferences.messages
    when 'follow_request' then preferences.follow_requests
    else preferences.follows
  end;
  if not coalesce(enabled, false) then return; end if;
  insert into public.notifications("senderId", "receiverId", type, title, data, dedupe_key)
  values (sender, receiver, kind, case kind
    when 'like' then 'liked your post'
    when 'comment' then 'commented on your post'
    when 'reply' then 'replied to your comment'
    when 'mention' then 'mentioned you'
    when 'follow' then 'started following you'
    when 'follow_request' then 'requested to follow you'
    when 'follow_accepted' then 'accepted your follow request'
    when 'message' then 'sent you a message'
    else 'sent you a notification' end, payload, key) on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function private.enqueue_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.notification_preferences where "userId" = new."receiverId" and push_enabled) then
    insert into private.push_queue(notification_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.mark_conversation_read(target uuid, through_message uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare read_time timestamptz;
begin
  if not private.is_member(target) then raise exception 'Conversation is unavailable' using errcode = '42501'; end if;
  select created_at into read_time from public.messages where id = through_message and conversation_id = target;
  if read_time is null then raise exception 'Message is unavailable' using errcode = '42501'; end if;
  update public.conversation_members
  set last_read_at = greatest(coalesce(last_read_at, '-infinity'::timestamptz), least(read_time, now())),
      last_delivered_at = greatest(coalesce(last_delivered_at, '-infinity'::timestamptz), least(read_time, now()))
  where conversation_id = target and "userId" = auth.uid();
end;
$$;

create function public.mark_conversation_delivered(target uuid, through_message uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare delivered_time timestamptz;
begin
  if not private.is_member(target) then raise exception 'Conversation is unavailable' using errcode = '42501'; end if;
  select created_at into delivered_time from public.messages
  where id = through_message and conversation_id = target and "userId" <> auth.uid();
  if delivered_time is null then raise exception 'Message is unavailable' using errcode = '42501'; end if;
  update public.conversation_members
  set last_delivered_at = greatest(coalesce(last_delivered_at, '-infinity'::timestamptz), least(delivered_time, now()))
  where conversation_id = target and "userId" = auth.uid();
end;
$$;

create function public.message_document(m public.messages) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', m.id,
    'client_id', m.client_id,
    'conversation_id', m.conversation_id,
    'userId', m."userId",
    'text', m.text,
    'message_type', m.message_type,
    'media_path', m.media_path,
    'mime_type', m.mime_type,
    'created_at', m.created_at,
    'deleted_at', m.deleted_at,
    'deleted_by_sender', m.deleted_by_sender,
    'status', case when m."userId" <> auth.uid() then 'sent'
      when receipts.last_read_at >= m.created_at then 'read'
      when receipts.last_delivered_at >= m.created_at then 'delivered'
      else 'sent' end,
    'reply_to', (
      select jsonb_build_object('id', parent.id, 'userId', parent."userId", 'text', parent.text,
        'message_type', parent.message_type, 'media_path', parent.media_path, 'deleted_at', parent.deleted_at)
      from public.messages parent where parent.id = m.reply_to_message_id
    ),
    'reactions', coalesce((
      select jsonb_agg(jsonb_build_object('emoji', aggregate_reactions.reaction, 'count', aggregate_reactions.count, 'reacted_by_me', aggregate_reactions.reacted_by_me) order by aggregate_reactions.reaction)
      from (
        select r.reaction, count(*)::integer as count, bool_or(r."userId" = auth.uid()) as reacted_by_me
        from public.message_reactions r where r.message_id = m.id group by r.reaction
      ) aggregate_reactions
    ), '[]'::jsonb)
  ) from public.conversation_members receipts
  where receipts.conversation_id = m.conversation_id and receipts."userId" <> m."userId"
  limit 1;
$$;

create function public.get_messages(p_conversation_id uuid, p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 30) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select public.message_document(m)
  from public.messages m
  where m.conversation_id = p_conversation_id
    and private.is_member(p_conversation_id)
    and not exists(select 1 from public.message_hidden_for_users hidden where hidden.message_id = m.id and hidden."userId" = auth.uid())
    and (p_before_time is null or (m.created_at, m.id) < (p_before_time, p_before_id))
  order by m.created_at desc, m.id desc
  limit greatest(1, least(p_limit, 50));
$$;

create function public.get_message(p_message_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select public.message_document(m) from public.messages m
  where m.id = p_message_id and private.is_member(m.conversation_id)
    and not exists(select 1 from public.message_hidden_for_users hidden where hidden.message_id = m.id and hidden."userId" = auth.uid());
$$;

create function public.conversation_document(c public.conversations) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(c) || jsonb_build_object(
    'other_user', (
      select jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username, 'image', u.image)
      from public.users u where u.id = case when c.user_low = auth.uid() then c.user_high else c.user_low end
    ),
    'latest_message', (
      select public.message_document(m) from public.messages m
      where m.conversation_id = c.id
        and not exists(select 1 from public.message_hidden_for_users hidden where hidden.message_id = m.id and hidden."userId" = auth.uid())
      order by m.created_at desc, m.id desc limit 1
    ),
    'unread_count', (
      select count(*)::integer from public.messages m
      join public.conversation_members cm on cm.conversation_id = m.conversation_id and cm."userId" = auth.uid()
      where m.conversation_id = c.id and m."userId" <> auth.uid() and m.deleted_at is null
        and not exists(select 1 from public.message_hidden_for_users hidden where hidden.message_id = m.id and hidden."userId" = auth.uid())
        and m.created_at > coalesce(cm.last_read_at, '-infinity'::timestamptz)
    )
  );
$$;

create or replace function public.get_conversations(p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 20) returns setof jsonb
language sql stable security invoker set search_path = '' as $$
  select public.conversation_document(c) from public.conversations c
  where private.is_member(c.id)
    and (p_before_time is null or (c.updated_at, c.id) < (p_before_time, p_before_id))
  order by c.updated_at desc, c.id desc limit greatest(1, least(p_limit, 50));
$$;

create function public.get_conversation(p_conversation_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select public.conversation_document(c) from public.conversations c
  where c.id = p_conversation_id and private.is_member(c.id);
$$;

create or replace function public.message_unread_count() returns bigint
language sql stable security invoker set search_path = '' as $$
  select count(*) from public.messages m
  join public.conversation_members cm on cm.conversation_id = m.conversation_id and cm."userId" = auth.uid()
  where m."userId" <> auth.uid() and m.deleted_at is null
    and not exists(select 1 from public.message_hidden_for_users hidden where hidden.message_id = m.id and hidden."userId" = auth.uid())
    and m.created_at > coalesce(cm.last_read_at, '-infinity'::timestamptz);
$$;

create function public.send_message(p_conversation_id uuid, p_client_id uuid, p_text text default '', p_media_path text default null, p_mime_type text default null, p_reply_to_message_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare message public.messages; requested_type text;
begin
  if auth.uid() is null or not private.is_member(p_conversation_id) then
    raise exception 'Conversation is unavailable' using errcode = '42501';
  end if;
  if p_client_id is null then raise exception 'A client message id is required' using errcode = '23514'; end if;
  select * into message from public.messages where "userId" = auth.uid() and client_id = p_client_id;
  if found then return public.message_document(message); end if;
  perform private.consume_rate('messages', 30);
  requested_type := case when p_media_path is null then 'text' else 'image' end;
  insert into public.messages(conversation_id, "userId", client_id, text, message_type, media_path, mime_type, reply_to_message_id)
  values (p_conversation_id, auth.uid(), p_client_id, coalesce(p_text, ''), requested_type, p_media_path, p_mime_type, p_reply_to_message_id)
  returning * into message;
  return public.message_document(message);
end;
$$;

create function public.set_message_reaction(p_message_id uuid, p_reaction text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare target public.messages; value text;
begin
  select * into target from public.messages where id = p_message_id;
  if not found or not private.is_member(target.conversation_id) or target.deleted_at is not null then
    raise exception 'Message is unavailable' using errcode = '42501';
  end if;
  if p_reaction not in ('❤️', '👍', '😂', '😮', '😢', '🔥') then raise exception 'Unsupported reaction' using errcode = '23514'; end if;
  select reaction into value from public.message_reactions where message_id = p_message_id and "userId" = auth.uid();
  if value = p_reaction then
    delete from public.message_reactions where message_id = p_message_id and "userId" = auth.uid();
  else
    insert into public.message_reactions(message_id, "userId", reaction) values (p_message_id, auth.uid(), p_reaction)
    on conflict (message_id, "userId") do update set reaction = excluded.reaction;
  end if;
  return public.message_document(target);
end;
$$;

create function public.hide_message_for_me(p_message_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.messages;
begin
  select * into target from public.messages where id = p_message_id;
  if not found or not private.is_member(target.conversation_id) then raise exception 'Message is unavailable' using errcode = '42501'; end if;
  insert into public.message_hidden_for_users(message_id, "userId") values (p_message_id, auth.uid()) on conflict do nothing;
end;
$$;

create function public.delete_message_for_everyone(p_message_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare target public.messages;
begin
  select * into target from public.messages where id = p_message_id for update;
  if not found or not private.is_member(target.conversation_id) or target."userId" <> auth.uid() then
    raise exception 'Message is unavailable' using errcode = '42501';
  end if;
  if target.deleted_at is null then
    update public.messages set text = '', media_path = null, mime_type = null, deleted_at = now(), deleted_by_sender = true
    where id = p_message_id returning * into target;
    delete from public.message_reactions where message_id = p_message_id;
  end if;
  return public.message_document(target);
end;
$$;

create function private.queue_message_media_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.media_path is not null and old.media_path is distinct from new.media_path then
    insert into private.storage_cleanup(path) values (old.media_path) on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger cleanup_message_media_update before update of media_path on public.messages
  for each row execute function private.queue_message_media_update();

drop trigger if exists messages_rate on public.messages;

create function public.register_push_token(p_device_id uuid, p_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' or p_platform not in ('ios', 'android') then
    raise exception 'Invalid push token' using errcode = '23514';
  end if;
  delete from public.push_tokens where token = p_token and "userId" <> auth.uid();
  insert into public.push_tokens("userId", device_id, token, platform, last_used_at, disabled_at, failure_count)
  values (auth.uid(), p_device_id, p_token, p_platform, now(), null, 0)
  on conflict ("userId", device_id) do update
    set token = excluded.token, platform = excluded.platform, last_used_at = now(), disabled_at = null, failure_count = 0;
end;
$$;

create function public.unregister_push_token(p_device_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_tokens where "userId" = auth.uid() and device_id = p_device_id;
$$;

-- The Edge Function authenticates with the service-role key and is the only
-- process allowed to claim or complete dispatch jobs. Clients cannot enumerate
-- other users' tokens, queues, or receipts.
create function public.claim_push_jobs(p_limit integer default 50)
returns table(notification_id uuid, token text, notification_type text, sender_name text, message_preview text, data jsonb, message_previews boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  return query
  with picked as (
    select q.notification_id from private.push_queue q
    join public.notifications n on n.id = q.notification_id
    join public.notification_preferences pref on pref."userId" = n."receiverId"
    where q.delivered_at is null
      and (q.claimed_at is null or q.claimed_at < now() - interval '5 minutes')
    order by q.created_at
    limit greatest(1, least(p_limit, 100))
    for update of q skip locked
  ), claimed as (
    update private.push_queue q set claimed_at = now(), attempts = q.attempts + 1
    from picked where q.notification_id = picked.notification_id
    returning q.notification_id
  )
  select n.id, pt.token, n.type, sender.name,
    case when n.type = 'message' then coalesce(left(m.text, 180), 'Photo') else null end,
    n.data, pref.message_previews
  from claimed c
  join public.notifications n on n.id = c.notification_id
  join public.notification_preferences pref on pref."userId" = n."receiverId"
  left join public.users sender on sender.id = n."senderId"
  left join public.messages m on m.id = nullif(n.data->>'messageId', '')::uuid
  left join public.push_tokens pt on pt."userId" = n."receiverId" and pt.disabled_at is null and pref.push_enabled;
end;
$$;

create function public.complete_push_jobs(p_notification_ids uuid[], p_tickets jsonb default '[]'::jsonb, p_invalid_tokens text[] default '{}'::text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  update private.push_queue set delivered_at = now(), claimed_at = null, ticket_ids = p_tickets, last_error = null
  where notification_id = any(p_notification_ids);
  insert into private.push_receipts(ticket_id, notification_id, token)
  select ticket.value->>'ticketId', (ticket.value->>'notificationId')::uuid, ticket.value->>'token'
  from jsonb_array_elements(p_tickets) as ticket(value)
  where ticket.value ? 'ticketId' and ticket.value ? 'notificationId' and ticket.value ? 'token'
  on conflict (ticket_id) do nothing;
  delete from public.push_tokens where token = any(p_invalid_tokens);
end;
$$;

create function public.claim_push_receipts(p_limit integer default 100) returns table(ticket_id text, token text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  return query
  with picked as (
    select r.ticket_id from private.push_receipts r
    where r.checked_at is null and r.created_at < now() - interval '1 minute'
      and (r.claimed_at is null or r.claimed_at < now() - interval '5 minutes')
    order by r.created_at limit greatest(1, least(p_limit, 100)) for update skip locked
  )
  update private.push_receipts r set claimed_at = now()
  from picked where r.ticket_id = picked.ticket_id returning r.ticket_id, r.token;
end;
$$;

create function public.complete_push_receipts(p_ticket_ids text[], p_invalid_tokens text[] default '{}'::text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  update private.push_receipts set checked_at = now(), claimed_at = null where ticket_id = any(p_ticket_ids);
  delete from public.push_tokens where token = any(p_invalid_tokens);
end;
$$;

alter publication supabase_realtime add table public.message_reactions, public.message_hidden_for_users;

revoke execute on function public.message_document(public.messages), public.conversation_document(public.conversations) from public, anon;
grant execute on function public.message_document(public.messages), public.conversation_document(public.conversations) to authenticated;
revoke execute on function public.get_messages(uuid, timestamptz, uuid, integer), public.get_message(uuid), public.get_conversation(uuid), public.send_message(uuid, uuid, text, text, text, uuid), public.set_message_reaction(uuid, text), public.hide_message_for_me(uuid), public.delete_message_for_everyone(uuid), public.mark_conversation_delivered(uuid, uuid), public.register_push_token(uuid, text, text), public.unregister_push_token(uuid) from public, anon;
grant execute on function public.get_messages(uuid, timestamptz, uuid, integer), public.get_message(uuid), public.get_conversation(uuid), public.send_message(uuid, uuid, text, text, text, uuid), public.set_message_reaction(uuid, text), public.hide_message_for_me(uuid), public.delete_message_for_everyone(uuid), public.mark_conversation_delivered(uuid, uuid), public.register_push_token(uuid, text, text), public.unregister_push_token(uuid) to authenticated;
revoke execute on function public.claim_push_jobs(integer), public.complete_push_jobs(uuid[], jsonb, text[]), public.claim_push_receipts(integer), public.complete_push_receipts(text[], text[]) from public, anon, authenticated;
grant execute on function public.claim_push_jobs(integer), public.complete_push_jobs(uuid[], jsonb, text[]), public.claim_push_receipts(integer), public.complete_push_receipts(text[], text[]) to service_role;

-- Deliver push jobs without a mobile-client poller or an external scheduler.
-- The queue remains the source of truth; pg_net only wakes the protected Edge
-- Function after commit, while pg_cron is a recovery and receipt-processing backstop.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

alter table private.push_queue
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists failed_at timestamptz;

alter table private.push_receipts
  add column if not exists attempts integer not null default 0 check (attempts >= 0),
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists failed_at timestamptz;

create index if not exists push_queue_pending_dispatch
  on private.push_queue (next_attempt_at, created_at)
  where delivered_at is null and failed_at is null;
create index if not exists push_receipts_pending_check
  on private.push_receipts (next_attempt_at, created_at)
  where checked_at is null and failed_at is null;

-- Secrets are deliberately not embedded in a migration or sent by a client.
-- Configure these named Vault values after deployment:
--   push_dispatch_url     https://<project-ref>.supabase.co/functions/v1/dispatch-push
--   push_dispatch_secret  the same value as the Edge Function PUSH_FUNCTION_SECRET
create or replace function private.invoke_push_dispatch(p_action text default 'dispatch') returns void
language plpgsql security definer set search_path = '' as $$
declare dispatch_url text; dispatch_secret text;
begin
  if p_action not in ('dispatch', 'receipts') then
    raise exception 'Unsupported push dispatch action' using errcode = '22023';
  end if;

  select decrypted_secret into dispatch_url
  from vault.decrypted_secrets where name = 'push_dispatch_url' limit 1;
  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets where name = 'push_dispatch_secret' limit 1;

  -- Missing production configuration must never block the originating write.
  if dispatch_url is null or dispatch_secret is null then return; end if;

  perform net.http_post(
    url := dispatch_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-function-secret', dispatch_secret),
    body := jsonb_build_object('action', p_action),
    timeout_milliseconds := 5000
  );
exception when others then
  -- pg_cron will make the next bounded recovery attempt. Do not expose a Vault
  -- value or fail a user-visible notification transaction because pg_net is down.
  raise warning 'Push dispatch wake-up could not be queued';
end;
$$;

create function private.wake_push_dispatch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.invoke_push_dispatch('dispatch');
  return new;
end;
$$;

create trigger wake_push_dispatch_after_enqueue
after insert on private.push_queue
for each row execute function private.wake_push_dispatch();

create or replace function public.claim_push_jobs(p_limit integer default 50)
returns table(notification_id uuid, token text, notification_type text, sender_name text, message_preview text, data jsonb, message_previews boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;

  update private.push_queue
  set failed_at = now(), claimed_at = null, last_error = coalesce(last_error, 'Push delivery retry limit reached')
  where delivered_at is null and failed_at is null and attempts >= 5;

  return query
  with picked as (
    select q.notification_id from private.push_queue q
    join public.notifications n on n.id = q.notification_id
    join public.notification_preferences pref on pref."userId" = n."receiverId"
    where q.delivered_at is null and q.failed_at is null and q.attempts < 5
      and q.next_attempt_at <= now()
      and (q.claimed_at is null or q.claimed_at < now() - interval '2 minutes')
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

create or replace function public.complete_push_jobs(p_notification_ids uuid[], p_tickets jsonb default '[]'::jsonb, p_invalid_tokens text[] default '{}'::text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;

  update private.push_queue q
  set delivered_at = now(), claimed_at = null, next_attempt_at = now(), last_error = null,
      ticket_ids = coalesce((
        select jsonb_agg(ticket.value)
        from jsonb_array_elements(p_tickets) as ticket(value)
        where ticket.value->>'notificationId' = q.notification_id::text
      ), '[]'::jsonb)
  where q.notification_id = any(p_notification_ids);

  insert into private.push_receipts(ticket_id, notification_id, token)
  select ticket.value->>'ticketId', (ticket.value->>'notificationId')::uuid, ticket.value->>'token'
  from jsonb_array_elements(p_tickets) as ticket(value)
  where ticket.value ? 'ticketId' and ticket.value ? 'notificationId' and ticket.value ? 'token'
  on conflict (ticket_id) do nothing;

  update public.push_tokens
  set disabled_at = now(), failure_count = failure_count + 1, updated_at = now()
  where token = any(p_invalid_tokens) and disabled_at is null;
end;
$$;

create function public.release_push_jobs(p_notification_ids uuid[], p_error text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  update private.push_queue
  set claimed_at = null,
      last_error = left(coalesce(nullif(p_error, ''), 'Push delivery attempt failed'), 300),
      failed_at = case when attempts >= 5 then now() else null end,
      next_attempt_at = case
        when attempts = 1 then now() + interval '30 seconds'
        when attempts = 2 then now() + interval '1 minute'
        when attempts = 3 then now() + interval '2 minutes'
        when attempts = 4 then now() + interval '4 minutes'
        else now()
      end
  where notification_id = any(p_notification_ids) and delivered_at is null and failed_at is null;
end;
$$;

create or replace function public.claim_push_receipts(p_limit integer default 100) returns table(ticket_id text, token text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;

  update private.push_receipts
  set failed_at = now(), claimed_at = null, last_error = coalesce(last_error, 'Push receipt retry limit reached')
  where checked_at is null and failed_at is null and attempts >= 5;

  return query
  with picked as (
    select r.ticket_id from private.push_receipts r
    where r.checked_at is null and r.failed_at is null and r.attempts < 5
      and r.created_at < now() - interval '1 minute'
      and r.next_attempt_at <= now()
      and (r.claimed_at is null or r.claimed_at < now() - interval '2 minutes')
    order by r.created_at limit greatest(1, least(p_limit, 100)) for update skip locked
  )
  update private.push_receipts r set claimed_at = now(), attempts = r.attempts + 1
  from picked where r.ticket_id = picked.ticket_id returning r.ticket_id, r.token;
end;
$$;

create or replace function public.complete_push_receipts(p_ticket_ids text[], p_invalid_tokens text[] default '{}'::text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  update private.push_receipts
  set checked_at = now(), claimed_at = null, next_attempt_at = now(), last_error = null
  where ticket_id = any(p_ticket_ids);
  update public.push_tokens
  set disabled_at = now(), failure_count = failure_count + 1, updated_at = now()
  where token = any(p_invalid_tokens) and disabled_at is null;
end;
$$;

create function public.release_push_receipts(p_ticket_ids text[], p_error text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;
  update private.push_receipts
  set claimed_at = null,
      last_error = left(coalesce(nullif(p_error, ''), 'Push receipt check failed'), 300),
      failed_at = case when attempts >= 5 then now() else null end,
      next_attempt_at = case
        when attempts = 1 then now() + interval '30 seconds'
        when attempts = 2 then now() + interval '1 minute'
        when attempts = 3 then now() + interval '2 minutes'
        when attempts = 4 then now() + interval '4 minutes'
        else now()
      end
  where ticket_id = any(p_ticket_ids) and checked_at is null and failed_at is null;
end;
$$;

revoke execute on function private.invoke_push_dispatch(text), private.wake_push_dispatch() from public, anon, authenticated;
revoke execute on function public.release_push_jobs(uuid[], text), public.release_push_receipts(text[], text) from public, anon, authenticated;
grant execute on function public.release_push_jobs(uuid[], text), public.release_push_receipts(text[], text) to service_role;

select cron.schedule(
  'linkup-push-dispatch-retry',
  '* * * * *',
  $cron$select private.invoke_push_dispatch('dispatch');$cron$
);
select cron.schedule(
  'linkup-push-receipt-retry',
  '* * * * *',
  $cron$select private.invoke_push_dispatch('receipts');$cron$
);

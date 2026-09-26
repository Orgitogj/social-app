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
    case when n.type = 'message' then case m.message_type
        when 'story_reply' then 'Replied to your story: ' || left(m.text, 150)
        when 'story_reaction' then 'Reacted ' || m.text || ' to your story'
        else coalesce(left(m.text, 180), 'Photo') end
      else null end,
    case when n.type = 'story_mention' then jsonb_build_object('storyId', n.data->>'storyId') else n.data end,
    pref.message_previews
  from claimed c
  join public.notifications n on n.id = c.notification_id
  join public.notification_preferences pref on pref."userId" = n."receiverId"
  left join public.users sender on sender.id = n."senderId"
  left join public.messages m on m.id = nullif(n.data->>'messageId', '')::uuid
  left join public.push_tokens pt on pt."userId" = n."receiverId" and pt.disabled_at is null and pref.push_enabled;
end;
$$;

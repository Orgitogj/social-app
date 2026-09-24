alter table public.messages
  add column story_id uuid references public.stories(id) on delete set null,
  add column story_context jsonb;

alter table public.messages drop constraint messages_message_type_check;
alter table public.messages add constraint messages_message_type_check
  check (message_type in ('text', 'image', 'video', 'audio', 'file', 'location', 'story_reply', 'story_reaction'));
alter table public.messages add constraint messages_story_context
  check ((message_type in ('story_reply', 'story_reaction')) = (story_context is not null)
    and (story_id is null or story_context is not null)
    and (story_context is null or (jsonb_typeof(story_context) = 'object'
      and story_context->>'story_id' is not null and story_context->>'author_id' is not null
      and story_context->>'media_type' in ('image', 'video') and story_context->>'created_at' is not null)));

create index messages_story on public.messages (story_id, "userId", created_at desc) where story_id is not null;

create or replace function private.validate_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is not null or new.deleted_by_sender then
    raise exception 'Messages must be created before they can be deleted' using errcode = '23514';
  end if;
  if new.message_type in ('text', 'story_reply', 'story_reaction') and new.media_path is not null then
    raise exception 'Text messages cannot include media' using errcode = '23514';
  end if;
  if new.message_type = 'image' and (new.media_path is null or new.mime_type is null) then
    raise exception 'Image messages require an image upload' using errcode = '23514';
  end if;
  if new.message_type not in ('text', 'image', 'story_reply', 'story_reaction') then
    raise exception 'This message type is not available yet' using errcode = '23514';
  end if;
  if new.message_type in ('story_reply', 'story_reaction') then
    if new.story_id is null or not exists(
      select 1 from public.stories s join public.conversation_members m on m.conversation_id = new.conversation_id and m."userId" = s.author_id
      where s.id = new.story_id and s.expires_at > now() and s.author_id <> auth.uid()
    ) or not private.can_view_story(new.story_id) then
      raise exception 'Story is unavailable' using errcode = '42501';
    end if;
    if new.message_type = 'story_reaction' and new.text not in ('❤️', '😂', '😮', '😢', '🔥', '👍') then
      raise exception 'Unsupported reaction' using errcode = '23514';
    end if;
  elsif new.story_id is not null or new.story_context is not null then
    raise exception 'Only story messages can reference a story' using errcode = '23514';
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

create or replace function public.message_document(m public.messages) returns jsonb
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
    ), '[]'::jsonb),
    'story', case when m.story_context is not null and m.deleted_at is null then m.story_context || coalesce((
      select jsonb_build_object('available', true, 'preview_path', coalesce(s.thumbnail_path, case when s.media_type = 'image' then s.media_path end), 'expires_at', s.expires_at)
      from public.stories s where s.id = m.story_id and s.expires_at > now()
    ), jsonb_build_object('available', false, 'preview_path', null)) end
  ) from public.conversation_members receipts
  where receipts.conversation_id = m.conversation_id and receipts."userId" <> m."userId"
  limit 1;
$$;

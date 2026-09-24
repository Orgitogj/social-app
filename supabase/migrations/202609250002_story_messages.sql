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

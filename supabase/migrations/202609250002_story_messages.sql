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

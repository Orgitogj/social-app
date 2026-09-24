-- Phase 9: Story views. One row per (story, viewer) is one logical view, so
-- repeated playback can never inflate view state. Rows disappear with the story
-- or the viewer's account.

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

-- The primary key serves "has this viewer seen this story" lookups and future
-- per-story viewer lists; this one serves account-deletion cascades.
create index story_views_viewer on public.story_views (viewer_id);

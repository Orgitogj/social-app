create or replace function private.queue_media_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'post_media' then
    insert into private.storage_cleanup(path) values (old.path) on conflict do nothing;
    if old.thumbnail_path is not null then insert into private.storage_cleanup(path) values (old.thumbnail_path) on conflict do nothing; end if;
  elsif tg_table_name = 'messages' then
    if old.media_path is not null then
      insert into private.storage_cleanup(path) values (old.media_path) on conflict do nothing;
    end if;
  elsif tg_table_name = 'users' then
    if old.image is not null and (tg_op = 'DELETE' or old.image is distinct from new.image) then
      insert into private.storage_cleanup(path) values (old.image) on conflict do nothing;
    end if;
  end if;
  return old;
end;
$$;

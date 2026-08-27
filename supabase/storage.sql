-- ============================================================================
--  Audio storage bucket. Run in Supabase → SQL Editor AFTER schema.sql.
--  (You can also create the bucket in the Storage UI; this does it in SQL.)
-- ============================================================================

-- Public bucket named "audio": files are world-readable, but only authenticated
-- users may upload, and only into a folder named after their own user id.
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do nothing;

-- Public read of audio files.
drop policy if exists "audio public read" on storage.objects;
create policy "audio public read"
  on storage.objects for select
  using (bucket_id = 'audio');

-- Authenticated users may upload into audio/<their-uid>/...
drop policy if exists "audio user upload" on storage.objects;
create policy "audio user upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may replace/remove their own uploads; editors are covered via service role.
drop policy if exists "audio user update" on storage.objects;
create policy "audio user update"
  on storage.objects for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "audio user delete" on storage.objects;
create policy "audio user delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

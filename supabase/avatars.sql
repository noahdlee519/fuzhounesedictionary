-- ============================================================================
--  Avatars — profile pictures.
--  Run in Supabase → SQL Editor after the earlier migrations. Safe to re-run.
-- ============================================================================

-- 1. Where the picture URL lives.
alter table public.profiles add column if not exists avatar_url text;

-- 2. For NEW Google sign-ins, capture the Google profile picture automatically.
--    (Existing users just upload one on their account page.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email, '@', 1)),
    nullif(coalesce(new.raw_user_meta_data->>'avatar_url',
                    new.raw_user_meta_data->>'picture'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. A public 'avatars' storage bucket: image-only, 2 MB cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/png','image/jpeg','image/jpg','image/webp','image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may see avatars; a signed-in user may write only inside a folder
-- named after their own id (avatars/<uid>/...). Same shape as the audio bucket.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars user upload" on storage.objects;
create policy "avatars user upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars user update" on storage.objects;
create policy "avatars user update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars user delete" on storage.objects;
create policy "avatars user delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

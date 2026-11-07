-- ============================================================================
--  security_fixes_2.sql — fixes from the 5 Nov 2026 security audit
--  (claude/security-audit-2026-11-05.md in the project).
--
--  Run once in Supabase → SQL Editor, after every other file in this folder.
--  Safe to run more than once. Nothing here changes what the site's own pages
--  do; it closes ways around them for someone calling the database or the
--  storage API directly with the public key and their own sign-in.
--
--  1. Audio files: a contributor could overwrite (upsert) or delete the file
--     behind an approved recording, so different audio played on the word
--     page with no editor seeing it. Now a person may only delete a file of
--     theirs that no recording or word points to (the clean-up the recorder
--     does when a save is refused), and nobody may overwrite one.
--  2. Audio and avatar files could be LISTED by anyone, which turned up
--     pending and rejected takes (455 files listed on 5 Nov against 448
--     published recordings). Listing is now your own folder only. Public
--     links keep working: a public bucket serves them without this policy.
--  3. Profile pictures: the address check accepted any Supabase project's
--     storage, and accepted whatever was in the person's own user metadata,
--     which they can rewrite themselves. Now: this project's avatars bucket,
--     or the picture Google gave at sign-in (read from the identity record,
--     which users cannot edit).
--  4. Recording and word audio addresses: the same "any Supabase project"
--     gap, closed the same way.
--  5. Daily and per-minute limits counted rows by created_at, which the
--     browser could set on insert — backdated rows were never counted. Now
--     the database stamps the time itself. Word requests also get length caps.
--  6. Smaller gaps: a recording's sense must belong to its word; votes,
--     recordings, suggestions and requests can only be attached to words and
--     recordings the person can see; hidden recordings no longer show in the
--     public vote totals; entry_has_voice() is no longer callable from
--     outside.
-- ============================================================================

-- This project's address. Every check below pins to it; if the project ever
-- moves, change it here and in the four functions that use it.
-- (Supabase project ref: evusqeaahuhcgywechvi)

-- ---------------------------------------------------------------------------
--  1 and 2. Storage policies
-- ---------------------------------------------------------------------------

-- Nobody overwrites an audio file. The site always uploads under a new name
-- with upsert off, and editors' removals use the service role.
drop policy if exists "audio user update" on storage.objects;

-- Delete only a file of your own that nothing points to.
drop policy if exists "audio user delete" on storage.objects;
create policy "audio user delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.recordings r
       where position(('/storage/v1/object/public/audio/' || objects.name) in r.audio_url) > 0
    )
    and not exists (
      select 1 from public.entries e
       where position(('/storage/v1/object/public/audio/' || objects.name) in coalesce(e.audio_url, '')) > 0
    )
  );

-- Listing: your own folder only. (Storage's delete needs a select policy
-- too, so the recorder's clean-up still works.)
drop policy if exists "audio public read" on storage.objects;
drop policy if exists "audio own read" on storage.objects;
create policy "audio own read"
  on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars own read" on storage.objects;
create policy "avatars own read"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Both buckets must stay public, or the links on the site stop loading.
update storage.buckets set public = true where id in ('audio', 'avatars');

-- ---------------------------------------------------------------------------
--  3. Profile pictures
-- ---------------------------------------------------------------------------
create or replace function public.check_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- The service role (sign-up trigger, imports, account deletion) passes.
  if auth.uid() is null then
    return new;
  end if;

  new.display_name    := left(new.display_name, 80);
  new.origin_locality := left(new.origin_locality, 120);

  if new.origin_area is not null and not public.is_origin_area(new.origin_area) then
    raise exception 'That is not one of the places on the list.'
      using errcode = 'check_violation';
  end if;

  if new.avatar_url is not null
     and (tg_op = 'INSERT' or new.avatar_url is distinct from old.avatar_url) then
    if not (
         -- a picture in this project's avatars bucket, in the person's folder
         new.avatar_url ~ ('^https://(evusqeaahuhcgywechvi\.supabase\.co|[a-z0-9.-]+\.fuzhounese\.org)/storage/v1/object/public/avatars/'
                           || new.id::text || '/[^/?#]+$')
         -- or the picture Google gave this person at sign-in. The identity
         -- record is written by Supabase Auth; user metadata (which the old
         -- check read) can be rewritten by the user.
      or (new.avatar_url ~ '^https://[a-z0-9-]+\.googleusercontent\.com/'
          and exists (
            select 1 from auth.identities i
             where i.user_id = new.id
               and i.provider = 'google'
               and new.avatar_url in (i.identity_data->>'avatar_url', i.identity_data->>'picture')
          ))
    ) then
      raise exception 'That picture is not from this site''s own storage.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
--  4. Recording and word audio addresses: this project only
-- ---------------------------------------------------------------------------
create or replace function public.check_recording_url()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.audio_url is null
     or new.audio_url !~ ('^https://(evusqeaahuhcgywechvi\.supabase\.co|[a-z0-9.-]+\.fuzhounese\.org)/storage/v1/object/public/audio/'
                          || auth.uid()::text || '/[^/?#]+$')
  then
    raise exception 'That recording is not from this site''s own storage.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.check_entry_audio_url()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_editor() then
    return new;
  end if;
  new.audio_url := nullif(btrim(new.audio_url), '');
  if new.audio_url is not null
     and new.audio_url !~ ('^https://(evusqeaahuhcgywechvi\.supabase\.co|[a-z0-9.-]+\.fuzhounese\.org)/storage/v1/object/public/audio/'
                           || auth.uid()::text || '/[^/?#]+$')
  then
    new.audio_url := null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
--  5. The database stamps created_at, so the limits count every row
-- ---------------------------------------------------------------------------
-- On insert by a signed-in user, created_at is now(), whatever was sent.
-- The service role (imports, editors' actions) keeps what it sends.
create or replace function public.stamp_created_at()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.created_at := now();
    else
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['entries', 'recordings', 'suggestions', 'word_requests',
                           'word_request_votes', 'recording_votes']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists aa_stamp_created_at on public.%I', t);
      execute format('create trigger aa_stamp_created_at before insert or update of created_at on public.%I
                        for each row execute function public.stamp_created_at()', t);
    end if;
  end loop;
end $$;

-- A changed thumbs-up counts as new; an unchanged row keeps its time. This
-- replaces the "keep the old time" rule above for votes, so that changing a
-- vote from down to up shows as a new thumbs-up to the recording's owner.
create or replace function public.stamp_vote_time()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.created_at := case when new.value is distinct from old.value then now() else old.created_at end;
  end if;
  return new;
end;
$$;
drop trigger if exists ab_stamp_vote_time on public.recording_votes;
create trigger ab_stamp_vote_time
  before update on public.recording_votes
  for each row execute function public.stamp_vote_time();

-- Word requests: no review step, so they get length caps. Existing rows are
-- left alone; new ones are trimmed.
create or replace function public.cap_word_request()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.term := left(btrim(new.term), 100);
    new.note := left(nullif(btrim(new.note), ''), 500);
  end if;
  return new;
end;
$$;
drop trigger if exists ab_cap_word_request on public.word_requests;
create trigger ab_cap_word_request
  before insert or update of term, note on public.word_requests
  for each row execute function public.cap_word_request();

-- ---------------------------------------------------------------------------
--  6. Smaller gaps
-- ---------------------------------------------------------------------------

-- A recording of an example sentence must name a sense of its own word (the
-- same check suggestions already have).
drop trigger if exists recordings_check_sense on public.recordings;
create trigger recordings_check_sense
  before insert or update of sense_id, entry_id on public.recordings
  for each row execute function public.check_suggestion_sense();

-- Things can only be attached to words and recordings the person can see.
-- The subqueries run under the caller's own row rules, so "exists" means
-- "visible to me": approved, my own, or I am an editor.
drop policy if exists "recordings authed insert" on public.recordings;
create policy "recordings authed insert" on public.recordings for insert
  with check (
    auth.uid() is not null and contributor_id = auth.uid()
    and exists (select 1 from public.entries e where e.id = recordings.entry_id)
  );

drop policy if exists "suggestions authed insert" on public.suggestions;
create policy "suggestions authed insert" on public.suggestions for insert
  with check (
    auth.uid() is not null and contributor_id = auth.uid()
    and exists (select 1 from public.entries e where e.id = suggestions.entry_id)
  );

drop policy if exists "wr insert own" on public.word_requests;
create policy "wr insert own" on public.word_requests for insert
  with check (
    auth.uid() is not null and requested_by = auth.uid() and status = 'open'
    and (entry_id is null or exists (select 1 from public.entries e where e.id = word_requests.entry_id))
  );

drop policy if exists "recording_votes own insert" on public.recording_votes;
create policy "recording_votes own insert" on public.recording_votes for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.recordings r where r.id = recording_votes.recording_id)
  );

-- Public vote totals: published recordings only.
create or replace view public.recording_vote_totals as
  select v.recording_id,
         count(*) filter (where v.value = 1)  as up,
         count(*) filter (where v.value = -1) as down
  from public.recording_votes v
  join public.recordings r on r.id = v.recording_id and r.status = 'approved'
  group by v.recording_id;
grant select on public.recording_vote_totals to anon, authenticated;

-- Used only inside other database functions, which run as the owner.
revoke execute on function public.entry_has_voice(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
--  Checks. Each should read as noted.
-- ---------------------------------------------------------------------------
-- false: a signed-in user cannot make themselves an editor.
select has_column_privilege('authenticated', 'public.profiles', 'is_editor', 'UPDATE') as users_can_set_is_editor;
-- one row: the trigger that guards is_editor is there.
select tgname from pg_trigger where tgname = 'profiles_protect_is_editor';
-- the audio bucket's type list and size cap are set.
select id, public, file_size_limit, allowed_mime_types is not null as has_type_list
  from storage.buckets where id in ('audio', 'avatars');
-- the storage policies now in place.
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname;

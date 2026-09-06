-- ============================================================================
--  recording_note.sql — notes on recordings.
--
--  recordings.note has existed since recordings.sql but nothing wrote to it.
--  The Recorder now does ("a sentence I said it in", "how it is used"), both
--  with the take and afterwards. Three things here, all safe to re-run:
--
--   1. A length cap. Mirrors MAX_RECORDING_NOTE in src/lib/constants.ts —
--      change both together.
--   2. A policy letting a person update their OWN recording, so a note can
--      be added or corrected after the take is saved.
--   3. A trigger making sure that is the ONLY thing they can change. Without
--      it, the policy would also let a contributor flip their own status to
--      'approved' or re-stamp their origin. Editors and the service role
--      (auth.uid() is null there) are unaffected.
-- ============================================================================

alter table public.recordings
  drop constraint if exists recordings_note_len;

alter table public.recordings
  add constraint recordings_note_len
  check (note is null or char_length(note) <= 300);

-- 2. own update ------------------------------------------------------------
drop policy if exists "recordings own update" on public.recordings;
create policy "recordings own update" on public.recordings for update
  using (contributor_id = auth.uid())
  with check (contributor_id = auth.uid());

-- 3. …but only the note ----------------------------------------------------
create or replace function public.protect_recording_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_editor() then
    return new;
  end if;
  if new.entry_id        is distinct from old.entry_id
  or new.kind            is distinct from old.kind
  or new.sense_id        is distinct from old.sense_id
  or new.audio_url       is distinct from old.audio_url
  or new.seconds         is distinct from old.seconds
  or new.contributor_id  is distinct from old.contributor_id
  or new.origin_area     is distinct from old.origin_area
  or new.origin_locality is distinct from old.origin_locality
  or new.status          is distinct from old.status
  or new.review_notes    is distinct from old.review_notes
  or new.created_at      is distinct from old.created_at
  or new.reviewed_at     is distinct from old.reviewed_at
  then
    raise exception 'Only the note on a recording can be changed by its contributor.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists recordings_protect_columns on public.recordings;
create trigger recordings_protect_columns
  before update on public.recordings
  for each row execute function public.protect_recording_columns();

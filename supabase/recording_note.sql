-- ============================================================================
--  recording_note.sql — a length cap on the note a person leaves with a take.
--
--  recordings.note has existed since recordings.sql but nothing wrote to it.
--  The Recorder now does ("a sentence I said it in", "how it is used"), so the
--  column gets the same kind of ceiling the suggestions table has. Mirrors
--  MAX_RECORDING_NOTE in src/lib/constants.ts — change both together.
--  Safe to re-run.
-- ============================================================================

alter table public.recordings
  drop constraint if exists recordings_note_len;

alter table public.recordings
  add constraint recordings_note_len
  check (note is null or char_length(note) <= 300);

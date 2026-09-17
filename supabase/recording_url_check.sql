-- ============================================================================
--  recordings.audio_url must point into this project's own audio bucket.
--  Run in Supabase → SQL Editor. Safe to run more than once.
--
--  A signed-in contributor inserts their own recordings row, and the row's
--  audio_url is whatever the browser sent. The upload itself is safe — the
--  storage policy only lets a user write under their own folder — but nothing
--  checked that the URL in the row was the URL of that upload. A row could
--  name any address on the internet, and the play button would fetch it: no
--  script runs, but whoever controls that address learns the IP of every
--  editor who reviews it, and of every visitor once it is approved.
--
--  This constraint says a URL written by a signed-in user must be a public
--  object in this project's audio bucket, in that user's own folder. The
--  service role (the import script, the editors' actions) is not bound by it,
--  so imported recordings with other hosts still load.
-- ============================================================================

create or replace function public.check_recording_url()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only a signed-in user's own insert is checked; service role passes.
  if auth.uid() is null then
    return new;
  end if;

  -- Host: this project on supabase.co, or a custom domain under
  -- fuzhounese.org if one is ever attached — the public URL follows whichever
  -- the client was built against. Path: the storage public-object route, the
  -- audio bucket, and the uploader's own folder.
  if new.audio_url is null
     or new.audio_url !~ ('^https://([a-z0-9-]+\.supabase\.co|[a-z0-9.-]+\.fuzhounese\.org)/storage/v1/object/public/audio/'
                          || auth.uid()::text || '/[^/?#]+$')
  then
    raise exception 'That recording is not from this site''s own storage.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists recordings_check_url on public.recordings;
create trigger recordings_check_url
  before insert or update of audio_url on public.recordings
  for each row execute function public.check_recording_url();

-- Confirm: the trigger exists.
select tgname, tgenabled
  from pg_trigger
 where tgrelid = 'public.recordings'::regclass
   and tgname = 'recordings_check_url';

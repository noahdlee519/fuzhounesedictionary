-- ============================================================================
--  Recording cap — two recordings per person per word. Run in Supabase →
--  SQL Editor. Safe to run more than once, and safe to run before or after
--  recordings.sql, which now carries the same function body.
--
--  Counts every non-rejected recording (pending or approved, the word on its
--  own or in a sentence) by one contributor on one entry. At two, further
--  inserts are refused with a message the recorder shows as written. Editors
--  are not exempt: this is a content rule, unlike the rate limits below it.
--  The site hides the record button at the cap (src/app/entry/[id]/page.tsx,
--  src/app/improve/page.tsx), so the message is only a backstop.
-- ============================================================================

create or replace function public.enforce_recording_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  max_per_word constant int := 2;    -- mirrored by MAX_RECORDINGS_PER_WORD in src/lib/constants.ts
  max_pending  constant int := 100;
  max_per_day  constant int := 200;  -- a recording session is meant to be fast
  max_per_min  constant int := 20;
  v_uid uuid := auth.uid();
  v_n   int;
begin
  if v_uid is null then
    return new;                      -- service role (import scripts)
  end if;

  -- Two takes of one word per person — say it on its own and in a sentence,
  -- or two tries at the word — and that is the word done for you. Rejected
  -- takes do not count, so a "please try again" from an editor is not a
  -- dead end. Applies to editors too: it is a content rule, not a rate limit.
  select count(*) into v_n from public.recordings
    where contributor_id = v_uid and entry_id = new.entry_id and status <> 'rejected';
  if v_n >= max_per_word then
    raise exception 'You have already recorded this word twice, which is the limit per word.'
      using errcode = 'check_violation';
  end if;

  if public.is_editor() then
    return new;
  end if;

  select count(*) into v_n from public.recordings
    where contributor_id = v_uid and status = 'pending';
  if v_n >= max_pending then
    raise exception
      'You have % recordings waiting for review. Once an editor has been through them you can add more.',
      v_n using errcode = 'check_violation';
  end if;

  select count(*) into v_n from public.recordings
    where contributor_id = v_uid and created_at > now() - interval '24 hours';
  if v_n >= max_per_day then
    raise exception
      'You have added % recordings today, which is the daily limit of %. Please carry on tomorrow.',
      v_n, max_per_day using errcode = 'check_violation';
  end if;

  select count(*) into v_n from public.recordings
    where contributor_id = v_uid and created_at > now() - interval '1 minute';
  if v_n >= max_per_min then
    raise exception 'That is a lot of recordings very quickly. Please wait a moment and try again.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists recordings_rate_limit on public.recordings;
create trigger recordings_rate_limit
  before insert on public.recordings
  for each row execute function public.enforce_recording_rate_limit();

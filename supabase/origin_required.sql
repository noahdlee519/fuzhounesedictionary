-- ===========================================================================
--  origin_required.sql — where your Fuzhounese is from is required (26 Sep 2026)
--
--  Run once in the Supabase SQL editor, after contributor_origin.sql,
--  recording_speaker.sql and suggestions.sql. Idempotent: safe to run again.
--
--  Until now the origin was optional: a contributor could leave it blank or
--  choose "show nothing", and their recordings went up with no place on
--  them. Noah made it required. On the site, anyone signed in without a
--  county or district is asked for one before they can do anything else
--  (src/components/OriginGate.tsx), and "show nothing" is no longer offered.
--  This is the same rule in the database, so it holds for a request that
--  does not come through those pages.
--
--  A signed-in person's new recording, word or suggested edit is refused
--  when it would carry no origin:
--    * recordings: after prepare_recording has stamped it — the account's
--      origin, or, for someone else speaking, the origin given for them.
--    * suggestions: after prepare_suggestion has stamped the account's.
--    * words: the account's profile. A word's own origin can still differ
--      from its contributor's, or be left open.
--  Editors are held to it too. Service-role writes (imports, scripts,
--  where auth.uid() is null) are not.
--
--  Triggers on a table fire in name order, so these are named to come after
--  the triggers that stamp the origin (recordings_prepare,
--  suggestions_prepare).
-- ===========================================================================

create or replace function public.require_origin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_area text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'entries' then
    select origin_area into v_area from public.profiles where id = auth.uid();
  else
    v_area := new.origin_area;
  end if;

  if v_area is null then
    -- Nested, not "and": a condition that names new.speaker_name would fail
    -- on the tables that have no such column.
    if tg_table_name = 'recordings' then
      if new.speaker_name is not null then
        raise exception 'Choose where the speaker''s Fuzhounese is from.'
          using errcode = 'check_violation', hint = 'speaker_origin_required';
      end if;
    end if;
    raise exception 'Tell us where your Fuzhounese is from (on your account page) before contributing.'
      using errcode = 'check_violation', hint = 'origin_required';
  end if;
  return new;
end;
$$;

drop trigger if exists recordings_require_origin on public.recordings;
create trigger recordings_require_origin
  before insert on public.recordings
  for each row execute function public.require_origin();

drop trigger if exists suggestions_require_origin on public.suggestions;
create trigger suggestions_require_origin
  before insert on public.suggestions
  for each row execute function public.require_origin();

drop trigger if exists entries_require_origin on public.entries;
create trigger entries_require_origin
  before insert on public.entries
  for each row execute function public.require_origin();

-- Confirm: accounts that will be asked on their next visit.
select count(*) filter (where origin_area is null)     as still_to_answer,
       count(*) filter (where origin_area is not null) as answered
  from public.profiles;

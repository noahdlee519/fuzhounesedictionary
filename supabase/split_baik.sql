-- ============================================================================
--  split_baik.sql — one-off data fix, 2026-09-07.
--
--  八 báik (entry 98521609-…) carried two meanings: the numeral "eight" and
--  the verb "to know; to recognise; to understand". A card shows only the
--  first sense, so the verb was invisible from every list. Noah's call: two
--  entries, one per part of speech.
--
--  What this does, in one transaction:
--   1. copies the entry (same characters, romanization, IPA, origin,
--      contributor, approved status; no audio_url, that stays put) → new row
--   2. moves the verb sense onto the new row, as its first sense
--   3. moves the recording whose note reads "I already know" with it — that
--      sentence is the verb, not the number
--  Safe to re-run: does nothing once the original has no verb sense left.
--  Run in the Supabase SQL editor (service role; the rate-limit trigger and
--  RLS do not apply there).
-- ============================================================================

do $$
declare
  v_old uuid := '98521609-7278-4c67-9166-196ee7d77614';
  v_new uuid;
begin
  if not exists (
    select 1 from public.senses where entry_id = v_old and part_of_speech = 'verb'
  ) then
    raise notice 'split_baik: nothing to do (no verb sense on %)', v_old;
    return;
  end if;

  insert into public.entries
    (headword, hanzi, romanization, ipa, audio_url, notes, variety,
     origin_area, origin_locality, status, contributor_id, reviewed_at, created_at)
  select headword, hanzi, romanization, ipa, null, notes, variety,
         origin_area, origin_locality, status, contributor_id, reviewed_at, created_at
  from public.entries where id = v_old
  returning id into v_new;

  update public.senses
     set entry_id = v_new, sort = 0
   where entry_id = v_old and part_of_speech = 'verb';

  -- re-number what is left on the original so it starts at 0 again
  with ordered as (
    select id, row_number() over (order by sort, id) - 1 as n
    from public.senses where entry_id = v_old
  )
  update public.senses s set sort = o.n from ordered o where s.id = o.id;

  update public.recordings
     set entry_id = v_new
   where entry_id = v_old and kind = 'headword' and note ilike '%already know%';

  raise notice 'split_baik: verb sense moved to new entry %', v_new;
end $$;

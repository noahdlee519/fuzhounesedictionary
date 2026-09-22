-- ============================================================================
--  Suggested edits and reports — "this entry is wrong, here is what should
--  change", and "this entry should not be here".
--  Run in Supabase → SQL Editor AFTER suggestions.sql. Safe to run more than once.
--
--  Until now "Suggest an edit" on a word page opened the visitor's mail app.
--  This lets a signed-in visitor type the correction on the page instead; it
--  lands in the same review queue as IPA and example suggestions, as a third
--  kind, 'edit'.
--
--  Unlike those two, an edit is free text for an editor to act on — it is not
--  copied onto the entry by apply_suggestion(), which only knows 'ipa' and
--  'example'. Approving one just marks it done once the editor has made the
--  change by hand.
-- ============================================================================

-- The kind list gains 'edit' and 'report' (a word flagged as wrong,
-- offensive, a duplicate… with a reason). Both are free text for an editor. The inline check from suggestions.sql was named
-- suggestions_kind_check by Postgres.
alter table public.suggestions drop constraint if exists suggestions_kind_check;
alter table public.suggestions add constraint suggestions_kind_check
  check (kind in ('ipa','example','edit','report'));

-- An edit or a report is about the whole word, so like IPA it names no sense.
alter table public.suggestions drop constraint if exists suggestions_sense_matches_kind;
alter table public.suggestions add constraint suggestions_sense_matches_kind
  check ((kind = 'example' and sense_id is not null)
      or (kind in ('ipa','edit','report') and sense_id is null));

-- apply_suggestion() is unchanged: it acts on 'ipa' and 'example' only, so
-- approving an 'edit' or a 'report' changes nothing on the entry by itself.
-- (If you ran an earlier copy of this file, run this one too: it only widens
-- the two checks.)

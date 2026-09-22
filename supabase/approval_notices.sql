-- ============================================================================
--  "Your word was accepted" — the red dot on a contributor's avatar and the
--  banner on their account page. Run in Supabase → SQL Editor AFTER
--  security_fixes.sql. Safe to run more than once.
--
--  One timestamp per person: when they last dismissed the banner. Anything of
--  theirs approved by an editor after that — a word, a recording, a
--  suggestion — counts as news. The default is the moment this runs, so
--  nobody is greeted with a notice for everything approved before today.
-- ============================================================================

alter table public.profiles
  add column if not exists approvals_seen_at timestamptz not null default now();

-- security_fixes.sql grants back only the profile columns a person may
-- change; dismissing the banner means they may change this one too.
grant update (approvals_seen_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
--  "Congratulations, you are now an editor." Shown once to someone whose
--  is_editor has been switched on, until they dismiss it. Editors who are
--  editors already when this runs are counted as welcomed.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists editor_welcomed_at timestamptz;

update public.profiles
   set editor_welcomed_at = now()
 where is_editor and editor_welcomed_at is null;

grant update (editor_welcomed_at) on public.profiles to authenticated;

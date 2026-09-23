-- ============================================================================
--  "Would you like to become an editor?" (23 Sep 2026)
--
--  Someone who has recorded 25 words or added 10 is invited, once, on their
--  account page, with the red dot on their avatar, to write to Noah about
--  becoming an editor (src/lib/approvals.ts, editorInvite). This column
--  remembers that they dismissed it. Until it exists the invitation is simply
--  not shown, so nobody sees a banner they cannot close.
--
--  Run in Supabase → SQL Editor. Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists editor_invite_seen_at timestamptz;

-- security_fixes.sql grants back only the profile columns a person may
-- change; closing the invitation means they may change this one too.
grant update (editor_invite_seen_at) on public.profiles to authenticated;

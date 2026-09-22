-- ============================================================================
--  google_avatars.sql — everyone's default picture is their Google one.
--  22 Sep 2026. Run once in Supabase → SQL Editor. Safe to re-run: it only
--  touches profiles that have no picture at all.
--
--  New accounts already start with their Google picture (avatars.sql, in
--  handle_new_user). Accounts made before that migration have none: on
--  22 Sep that was one person (kris huang, joined 29 Aug). This gives them
--  the picture from their Google sign-in.
--
--  Someone who removed their picture on purpose is not told apart from
--  someone who never had one, so they get the Google picture back too; the
--  account page's picture dialog can remove it again.
-- ============================================================================

update public.profiles p
set avatar_url = nullif(coalesce(u.raw_user_meta_data->>'avatar_url',
                                 u.raw_user_meta_data->>'picture'), '')
from auth.users u
where u.id = p.id
  and p.avatar_url is null
  and nullif(coalesce(u.raw_user_meta_data->>'avatar_url',
                      u.raw_user_meta_data->>'picture'), '') like 'https://%';

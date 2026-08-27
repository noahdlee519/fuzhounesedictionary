-- ============================================================================
--  RESET — run this FIRST if you previously set up the earlier draft of the
--  project in this same Supabase project. It removes the old tables/functions
--  so the new schema (with senses, profiles, and Google sign-in) can be created
--  cleanly. It does NOT touch your Google/Auth settings.
--
--  Safe on a fresh project too (the "if exists" clauses just do nothing).
--  After this, run:  schema.sql  →  storage.sql  →  seed.sql
-- ============================================================================

drop function if exists public.search_entries(text);
drop function if exists public.submit_entry(text, text, text, text, text, text, jsonb);
drop table if exists public.senses  cascade;
drop table if exists public.entries cascade;
drop table if exists public.profiles cascade;

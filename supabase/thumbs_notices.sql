-- ===========================================================================
--  thumbs_notices.sql — "your recordings got 3 thumbs-up", and "an editor
--  removed a word you had added or recorded" (11 Oct 2026). Two parts:
--  the function below, and the contributor_notices table at the end.
--
--  Run once in the Supabase SQL editor, after recording_votes.sql and
--  approval_notices.sql. Idempotent: safe to run again.
--
--  The red dot on someone's picture and the banner on their account page
--  said only that an editor had accepted something of theirs. Now they also
--  say when other people have given their recordings a thumbs-up since they
--  last looked — the one thing a recording earns after it goes up, and a
--  reason to come back and record more.
--
--  Who voted stays private: recording_votes shows a person only their own
--  votes. This function counts, for the person asking, the thumbs-up on
--  THEIR recordings since they last dismissed the banner
--  (profiles.approvals_seen_at), leaving out their own votes, and returns
--  only the number.
-- ===========================================================================

create or replace function public.my_new_thumbs_up()
returns int
language sql
stable
security definer set search_path = public
as $$
  select count(*)::int
    from public.recording_votes v
    join public.recordings r on r.id = v.recording_id
    join public.profiles p on p.id = r.contributor_id
   where r.contributor_id = auth.uid()
     and v.user_id <> auth.uid()
     and v.value = 1
     and v.created_at > p.approvals_seen_at;
$$;

revoke all on function public.my_new_thumbs_up() from public, anon;
grant execute on function public.my_new_thumbs_up() to authenticated;

-- Confirm: the function is there (returns 0 when run here, as no one is
-- signed in to the SQL editor).
select public.my_new_thumbs_up();

-- ===========================================================================
--  Words removed by an editor (11 Oct 2026). Deleting a word takes the row,
--  and with it every recording on it, so there was nothing left to say it
--  had happened: a contributor's word and takes simply vanished from their
--  account page. The editor's delete (src/app/editor/actions.ts deleteEntry)
--  now leaves one line here for each person who had added the word or
--  recorded it, and the account page's notice reads it.
--
--  Written only by the service role (the editor action). A person reads only
--  their own lines.
-- ===========================================================================

create table if not exists public.contributor_notices (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('word_removed', 'recording_removed')),
  -- What the word was, as it read when it went: there is no row left to ask.
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists contributor_notices_user_idx
  on public.contributor_notices (user_id, created_at);

alter table public.contributor_notices enable row level security;

drop policy if exists "contributor_notices own read" on public.contributor_notices;
create policy "contributor_notices own read" on public.contributor_notices
  for select using (user_id = auth.uid());

revoke all on public.contributor_notices from anon;
revoke insert, update, delete on public.contributor_notices from authenticated;
grant select on public.contributor_notices to authenticated;

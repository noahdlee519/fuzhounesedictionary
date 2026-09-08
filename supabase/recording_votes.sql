-- ============================================================================
--  recording_votes.sql — thumbs up / thumbs down on a recording (and its
--  note), 2026-09-09.
--
--  One vote per person per recording, +1 or -1; voting again the same way
--  removes it, the other way flips it (the app does that; here it is just an
--  upsert-able row). Who voted is private: the table's policies show a person
--  only their own rows. Totals are public through a view that runs with its
--  owner's rights, so anyone can read counts without seeing voters.
--  Safe to re-run.
-- ============================================================================

create table if not exists public.recording_votes (
  recording_id uuid not null references public.recordings(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  value        smallint not null check (value in (-1, 1)),
  created_at   timestamptz not null default now(),
  primary key (recording_id, user_id)
);

create index if not exists recording_votes_recording_idx on public.recording_votes (recording_id);

alter table public.recording_votes enable row level security;

drop policy if exists "recording_votes own read"   on public.recording_votes;
drop policy if exists "recording_votes own insert" on public.recording_votes;
drop policy if exists "recording_votes own update" on public.recording_votes;
drop policy if exists "recording_votes own delete" on public.recording_votes;

create policy "recording_votes own read" on public.recording_votes for select
  using (user_id = auth.uid());
create policy "recording_votes own insert" on public.recording_votes for insert
  with check (user_id = auth.uid());
create policy "recording_votes own update" on public.recording_votes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recording_votes own delete" on public.recording_votes for delete
  using (user_id = auth.uid());

-- Totals for everyone. Not security_invoker: it must see every row.
create or replace view public.recording_vote_totals as
  select recording_id,
         count(*) filter (where value = 1)  as up,
         count(*) filter (where value = -1) as down
  from public.recording_votes
  group by recording_id;

grant select on public.recording_vote_totals to anon, authenticated;

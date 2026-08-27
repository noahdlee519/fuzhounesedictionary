-- ============================================================================
--  Fuzhounese Dictionary — "Words Wanted" (request-a-word / request-a-voice)
--  Run in Supabase → SQL Editor AFTER schema.sql. Safe to run more than once.
-- ============================================================================

-- A request is either for a brand-new word (entry_id null) or for a recording
-- of an existing entry that has no audio yet (entry_id set). Community upvotes
-- push the most-wanted words to the top.
create table if not exists public.word_requests (
  id           uuid primary key default gen_random_uuid(),
  term         text not null,                 -- the word/phrase wanted (or the entry's headword)
  entry_id     uuid references public.entries(id) on delete cascade,
  note         text,                          -- optional context ("heard my grandma say it")
  status       text not null default 'open' check (status in ('open','fulfilled')),
  requested_by uuid references public.profiles(id) on delete set null,
  fulfilled_by uuid references public.profiles(id) on delete set null,
  fulfilled_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.word_request_votes (
  request_id uuid not null references public.word_requests(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

create index if not exists word_requests_status_idx on public.word_requests (status, created_at desc);
-- At most ONE open request per existing entry, and per free-text term.
create unique index if not exists word_requests_entry_open
  on public.word_requests (entry_id) where entry_id is not null and status = 'open';
create unique index if not exists word_requests_term_open
  on public.word_requests (lower(term)) where entry_id is null and status = 'open';

alter table public.word_requests      enable row level security;
alter table public.word_request_votes enable row level security;

-- word_requests: anyone reads; a signed-in user creates their OWN open request; editors manage.
drop policy if exists "wr readable"       on public.word_requests;
drop policy if exists "wr insert own"     on public.word_requests;
drop policy if exists "wr editors update" on public.word_requests;
drop policy if exists "wr editors delete" on public.word_requests;
create policy "wr readable"       on public.word_requests for select using (true);
create policy "wr insert own"     on public.word_requests for insert
  with check (auth.uid() is not null and requested_by = auth.uid() and status = 'open');
create policy "wr editors update" on public.word_requests for update using (public.is_editor());
create policy "wr editors delete" on public.word_requests for delete using (public.is_editor());

-- votes: anyone reads counts; a signed-in user adds/removes only their OWN vote.
drop policy if exists "wrv readable"   on public.word_request_votes;
drop policy if exists "wrv insert own" on public.word_request_votes;
drop policy if exists "wrv delete own" on public.word_request_votes;
create policy "wrv readable"   on public.word_request_votes for select using (true);
create policy "wrv insert own" on public.word_request_votes for insert with check (user_id = auth.uid());
create policy "wrv delete own" on public.word_request_votes for delete using (user_id = auth.uid());

grant select, insert on public.word_requests to authenticated;
grant update, delete on public.word_requests to authenticated;  -- RLS still limits update/delete to editors
grant select          on public.word_requests to anon;
grant select, insert, delete on public.word_request_votes to authenticated;
grant select                 on public.word_request_votes to anon;

-- Ranked view: open requests + vote counts + (if linked) the entry's current audio state.
create or replace view public.word_requests_ranked
with (security_invoker = true) as
select
  r.id, r.term, r.entry_id, r.note, r.status, r.requested_by, r.created_at,
  coalesce(v.votes, 0)::int as votes,
  e.hanzi, e.romanization, e.headword as entry_headword, e.audio_url as entry_audio_url
from public.word_requests r
left join (
  select request_id, count(*) as votes
  from public.word_request_votes
  group by request_id
) v on v.request_id = r.id
left join public.entries e on e.id = r.entry_id;

grant select on public.word_requests_ranked to anon, authenticated;

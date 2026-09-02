-- ============================================================================
--  Recordings — many voices per word, and per example sentence.
--  Run in Supabase → SQL Editor AFTER schema.sql, storage.sql, word_requests.sql,
--  contributor_origin.sql and abuse_limits.sql. Safe to run more than once.
--
--  Why a table rather than the single entries.audio_url column:
--   * a word can be said by several people, from several counties
--   * a word and a sentence containing it are different recordings
--   * the speaker's origin is worth keeping ON the recording, snapshotted at the
--     time, so it stays right even if they later change their profile
--  entries.audio_url is left alone and still works; the entry page prefers a
--  row from this table and falls back to the column.
-- ============================================================================

create table if not exists public.recordings (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references public.entries(id) on delete cascade,
  -- 'headword' = the word on its own. 'example' = a sentence using it, in which
  -- case sense_id says which sense's example is being read.
  kind            text not null default 'headword'
                    check (kind in ('headword','example')),
  sense_id        uuid references public.senses(id) on delete cascade,
  audio_url       text not null,
  seconds         numeric(5,2),
  note            text,
  -- who, and where their Fuzhounese is from, as it stood when they recorded
  contributor_id  uuid references public.profiles(id) on delete set null,
  origin_area     text,
  origin_locality text,
  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  review_notes    text,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz
);

create index if not exists recordings_entry_idx  on public.recordings (entry_id, status);
create index if not exists recordings_status_idx on public.recordings (status, created_at);
create index if not exists recordings_contrib_idx on public.recordings (contributor_id);

-- An 'example' recording must name the sense it belongs to; a 'headword' must not.
do $$ begin
  alter table public.recordings add constraint recordings_sense_matches_kind
    check ((kind = 'example' and sense_id is not null)
        or (kind = 'headword' and sense_id is null));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
--  Stamp the contributor's origin onto the row, and let editors publish their
--  own recordings immediately. Everyone else's wait for review, like entries.
-- ---------------------------------------------------------------------------
create or replace function public.prepare_recording()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_area text;
  v_loc  text;
begin
  if new.contributor_id is not null then
    select origin_area, origin_locality into v_area, v_loc
      from public.profiles where id = new.contributor_id;
    -- The profile decides, not the client. A signed-in user cannot label a
    -- recording with an origin other than the one on their profile; the
    -- service role (import scripts) may still set it explicitly.
    if auth.uid() is not null then
      new.origin_area     := v_area;
      new.origin_locality := v_loc;
    else
      new.origin_area     := coalesce(new.origin_area, v_area);
      new.origin_locality := coalesce(new.origin_locality, v_loc);
    end if;
  end if;

  -- service role (import scripts) and editors publish straight away
  if auth.uid() is null or public.is_editor() then
    new.status := coalesce(nullif(new.status, 'pending'), 'approved');
    if new.status = 'approved' then
      new.reviewed_at := coalesce(new.reviewed_at, now());
    end if;
  else
    new.status := 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists recordings_prepare on public.recordings;
create trigger recordings_prepare
  before insert on public.recordings
  for each row execute function public.prepare_recording();

-- ---------------------------------------------------------------------------
--  Rate limit, in the same shape as entries and word_requests.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_recording_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  max_per_word constant int := 2;    -- mirrored by MAX_RECORDINGS_PER_WORD in src/lib/constants.ts
  max_pending  constant int := 100;
  max_per_day  constant int := 200;  -- a recording session is meant to be fast
  max_per_min  constant int := 20;
  v_uid uuid := auth.uid();
  v_n   int;
begin
  if v_uid is null then
    return new;                      -- service role (import scripts)
  end if;

  -- Two takes of one word per person — say it on its own and in a sentence,
  -- or two tries at the word — and that is the word done for you. Rejected
  -- takes do not count, so a "please try again" from an editor is not a
  -- dead end. Applies to editors too: it is a content rule, not a rate limit.
  select count(*) into v_n from public.recordings
    where contributor_id = v_uid and entry_id = new.entry_id and status <> 'rejected';
  if v_n >= max_per_word then
    raise exception 'You have already recorded this word twice, which is the limit per word.'
      using errcode = 'check_violation';
  end if;

  if public.is_editor() then
    return new;
  end if;

  select count(*) into v_n from public.recordings
    where contributor_id = v_uid and status = 'pending';
  if v_n >= max_pending then
    raise exception
      'You have % recordings waiting for review. Once an editor has been through them you can add more.',
      v_n using errcode = 'check_violation';
  end if;

  select count(*) into v_n from public.recordings
    where contributor_id = v_uid and created_at > now() - interval '24 hours';
  if v_n >= max_per_day then
    raise exception
      'You have added % recordings today, which is the daily limit of %. Please carry on tomorrow.',
      v_n, max_per_day using errcode = 'check_violation';
  end if;

  select count(*) into v_n from public.recordings
    where contributor_id = v_uid and created_at > now() - interval '1 minute';
  if v_n >= max_per_min then
    raise exception 'That is a lot of recordings very quickly. Please wait a moment and try again.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists recordings_rate_limit on public.recordings;
create trigger recordings_rate_limit
  before insert on public.recordings
  for each row execute function public.enforce_recording_rate_limit();

-- ---------------------------------------------------------------------------
--  RLS: the public hears approved recordings on approved entries; you can see
--  and delete your own while they wait; editors see and change everything.
-- ---------------------------------------------------------------------------
alter table public.recordings enable row level security;

drop policy if exists "recordings public read"   on public.recordings;
drop policy if exists "recordings own read"      on public.recordings;
drop policy if exists "recordings editors read"  on public.recordings;
drop policy if exists "recordings authed insert" on public.recordings;
drop policy if exists "recordings own delete"    on public.recordings;
drop policy if exists "recordings editors write" on public.recordings;
drop policy if exists "recordings editors del"   on public.recordings;

create policy "recordings public read" on public.recordings for select using (
  status = 'approved'
  and exists (select 1 from public.entries e
              where e.id = recordings.entry_id and e.status = 'approved')
);
create policy "recordings own read" on public.recordings for select
  using (contributor_id = auth.uid());
create policy "recordings editors read" on public.recordings for select
  using (public.is_editor());

create policy "recordings authed insert" on public.recordings for insert
  with check (auth.uid() is not null and contributor_id = auth.uid());

-- a contributor may withdraw their own recording while it is still pending
create policy "recordings own delete" on public.recordings for delete
  using (contributor_id = auth.uid() and status = 'pending');

create policy "recordings editors write" on public.recordings for update
  using (public.is_editor());
create policy "recordings editors del" on public.recordings for delete
  using (public.is_editor());

-- ---------------------------------------------------------------------------
--  needs_recording — the worklist behind the recording session screen.
--  Approved entries with no approved headword recording, most-wanted first.
--  security_invoker so the caller's RLS still applies.
-- ---------------------------------------------------------------------------
drop view if exists public.needs_recording;
create view public.needs_recording
with (security_invoker = on) as
select
  e.id,
  e.headword,
  e.hanzi,
  e.romanization,
  e.origin_area,
  e.origin_locality,
  e.created_at,
  (select s.definition_en from public.senses s
    where s.entry_id = e.id order by s.sort, s.id limit 1) as short_gloss,
  coalesce((select count(*) from public.word_request_votes v
             join public.word_requests r on r.id = v.request_id
            where r.entry_id = e.id and r.status = 'open'), 0) as votes
from public.entries e
where e.status = 'approved'
  and e.audio_url is null
  and not exists (
    select 1 from public.recordings rec
     where rec.entry_id = e.id
       and rec.kind = 'headword'
       and rec.status = 'approved'
  );

grant select on public.needs_recording to anon, authenticated;

-- ============================================================================
--  Suggestions — contributed IPA and example sentences, held for review.
--  Run in Supabase → SQL Editor AFTER schema.sql, contributor_origin.sql,
--  abuse_limits.sql and recordings.sql. Safe to run more than once.
--
--  Why a separate table rather than letting people write entries.ipa and
--  senses.example directly: those two columns are what the site displays. If a
--  contributor could write them, an unreviewed edit would be live the moment it
--  was typed, and there would be nothing to roll back to. So a suggestion is a
--  row here until an editor approves it, and approving is what copies the value
--  onto the entry.
--
--  Same shape as recordings on purpose — one moderation model, not three.
-- ============================================================================

create table if not exists public.suggestions (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references public.entries(id) on delete cascade,
  -- 'ipa'     — a pronunciation for the whole entry; sense_id must be null
  -- 'example' — a sentence for one sense; sense_id says which
  kind            text not null check (kind in ('ipa','example')),
  sense_id        uuid references public.senses(id) on delete cascade,
  value           text not null,
  value_gloss     text,          -- the English of an example sentence
  note            text,          -- anything the contributor wants the editor to know
  -- who, and where their Fuzhounese is from, as it stood when they sent it
  contributor_id  uuid references public.profiles(id) on delete set null,
  origin_area     text,
  origin_locality text,
  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  review_notes    text,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz
);

create index if not exists suggestions_entry_idx   on public.suggestions (entry_id, status);
create index if not exists suggestions_status_idx  on public.suggestions (status, created_at);
create index if not exists suggestions_contrib_idx on public.suggestions (contributor_id, status);

-- An example must name its sense; an IPA suggestion must not.
do $$ begin
  alter table public.suggestions add constraint suggestions_sense_matches_kind
    check ((kind = 'example' and sense_id is not null)
        or (kind = 'ipa'     and sense_id is null));
exception when duplicate_object then null; end $$;

-- A sense named by an example must belong to the entry the example is for.
-- Without this, a hand-edited sense_id could file an example against word A
-- that, on approval, is written onto word B.
create or replace function public.check_suggestion_sense()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.sense_id is not null and not exists (
    select 1 from public.senses s
     where s.id = new.sense_id and s.entry_id = new.entry_id
  ) then
    raise exception 'That meaning does not belong to this word.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists suggestions_check_sense on public.suggestions;
create trigger suggestions_check_sense
  before insert or update of sense_id, entry_id on public.suggestions
  for each row execute function public.check_suggestion_sense();

-- Don't let the same person queue the same suggestion twice.
create unique index if not exists suggestions_no_dupe_pending
  on public.suggestions (entry_id, kind, coalesce(sense_id, entry_id), contributor_id, value)
  where status = 'pending';

-- ---------------------------------------------------------------------------
--  Stamp origin, and hold everyone but editors at 'pending'.
-- ---------------------------------------------------------------------------
create or replace function public.prepare_suggestion()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_area text;
  v_loc  text;
begin
  new.value := btrim(new.value);
  if new.value = '' then
    raise exception 'A suggestion cannot be empty.' using errcode = 'check_violation';
  end if;
  if length(new.value) > 500 then
    raise exception 'That is longer than this field allows. Please keep it under 500 characters.'
      using errcode = 'check_violation';
  end if;

  if new.contributor_id is not null then
    select origin_area, origin_locality into v_area, v_loc
      from public.profiles where id = new.contributor_id;
    -- The profile decides, not the client. A signed-in user cannot label a
    -- suggestion with an origin other than the one on their profile; the
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

drop trigger if exists suggestions_prepare on public.suggestions;
create trigger suggestions_prepare
  before insert on public.suggestions
  for each row execute function public.prepare_suggestion();

-- ---------------------------------------------------------------------------
--  Rate limit, same shape as entries, word_requests and recordings.
--  Tighter than recordings: a suggestion is typed, not spoken, so nobody has a
--  legitimate reason to file fifty a minute.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_suggestion_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  max_pending constant int := 50;
  max_per_day constant int := 100;
  max_per_min constant int := 10;
  v_uid uuid := auth.uid();
  v_n   int;
begin
  if v_uid is null or public.is_editor() then
    return new;
  end if;

  select count(*) into v_n from public.suggestions
    where contributor_id = v_uid and status = 'pending';
  if v_n >= max_pending then
    raise exception
      'You have % suggestions waiting for review. Once an editor has been through them you can add more.',
      v_n using errcode = 'check_violation';
  end if;

  select count(*) into v_n from public.suggestions
    where contributor_id = v_uid and created_at > now() - interval '24 hours';
  if v_n >= max_per_day then
    raise exception
      'You have sent % suggestions today, which is the daily limit of %. Please carry on tomorrow.',
      v_n, max_per_day using errcode = 'check_violation';
  end if;

  select count(*) into v_n from public.suggestions
    where contributor_id = v_uid and created_at > now() - interval '1 minute';
  if v_n >= max_per_min then
    raise exception 'That is a lot of suggestions very quickly. Please wait a moment and try again.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists suggestions_rate_limit on public.suggestions;
create trigger suggestions_rate_limit
  before insert on public.suggestions
  for each row execute function public.enforce_suggestion_rate_limit();

-- ---------------------------------------------------------------------------
--  Approving is what publishes the value. A trigger rather than application
--  code, so it holds however the row is approved — the admin screen, a script,
--  or someone clicking about in the Supabase dashboard.
--
--  It does NOT overwrite a value that is already there: if an editor filled the
--  IPA in while the suggestion sat in the queue, the editor's version wins and
--  the suggestion is recorded as approved without clobbering it.
-- ---------------------------------------------------------------------------
create or replace function public.apply_suggestion()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Fires on INSERT too: an editor's own suggestion arrives already approved
  -- (prepare_suggestion sets that), so an UPDATE-only trigger would mark it
  -- published and never actually publish it.
  if new.status = 'approved'
     and (tg_op = 'INSERT' or coalesce(old.status, '') <> 'approved') then
    new.reviewed_at := coalesce(new.reviewed_at, now());

    if new.kind = 'ipa' then
      update public.entries
         set ipa = new.value
       where id = new.entry_id
         and coalesce(btrim(ipa), '') = '';

    elsif new.kind = 'example' then
      update public.senses
         set example       = new.value,
             example_gloss = coalesce(nullif(btrim(new.value_gloss), ''), example_gloss)
       where id = new.sense_id
         and entry_id = new.entry_id            -- never a sense of another word
         and coalesce(btrim(example), '') = '';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists suggestions_apply on public.suggestions;
create trigger suggestions_apply
  before update on public.suggestions
  for each row execute function public.apply_suggestion();

-- The INSERT copy has to run AFTER the two BEFORE INSERT triggers have settled
-- the status, so it is a separate AFTER trigger rather than another BEFORE one.
drop trigger if exists suggestions_apply_insert on public.suggestions;
create trigger suggestions_apply_insert
  after insert on public.suggestions
  for each row execute function public.apply_suggestion();

-- ---------------------------------------------------------------------------
--  RLS. A pending suggestion is visible to the person who sent it and to
--  editors, and to nobody else — an unreviewed sentence should never be
--  readable from the public site.
-- ---------------------------------------------------------------------------
alter table public.suggestions enable row level security;

drop policy if exists "suggestions own read"      on public.suggestions;
drop policy if exists "suggestions editors read"  on public.suggestions;
drop policy if exists "suggestions authed insert" on public.suggestions;
drop policy if exists "suggestions own delete"    on public.suggestions;
drop policy if exists "suggestions editors write" on public.suggestions;
drop policy if exists "suggestions editors del"   on public.suggestions;

create policy "suggestions own read" on public.suggestions for select
  using (contributor_id = auth.uid());
create policy "suggestions editors read" on public.suggestions for select
  using (public.is_editor());

create policy "suggestions authed insert" on public.suggestions for insert
  with check (auth.uid() is not null and contributor_id = auth.uid());

-- a contributor may withdraw their own suggestion while it is still pending
create policy "suggestions own delete" on public.suggestions for delete
  using (contributor_id = auth.uid() and status = 'pending');

create policy "suggestions editors write" on public.suggestions for update
  using (public.is_editor());
create policy "suggestions editors del" on public.suggestions for delete
  using (public.is_editor());

-- Explicit privileges. Supabase grants these by default on new public tables,
-- but saying so here means the policies above are the whole story, and means a
-- plain Postgres copy of this schema behaves the same way.
grant select, insert, update, delete on public.suggestions to authenticated;
-- The anonymous role has no business reading an unreviewed sentence. No policy
-- grants it read anyway; this makes that true at the privilege level as well.
revoke all on public.suggestions from anon;

-- ---------------------------------------------------------------------------
--  needs_work — what the improve page lists. Approved entries missing any of
--  a recording, IPA or an example, with a count of how many people have asked
--  for the word. security_invoker so the caller's RLS still applies.
-- ---------------------------------------------------------------------------
drop view if exists public.needs_work;
create view public.needs_work
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
  (e.audio_url is null and not exists (
     select 1 from public.recordings rec
      where rec.entry_id = e.id and rec.kind = 'headword' and rec.status = 'approved'
   )) as needs_recording,
  (coalesce(btrim(e.ipa), '') = '') as needs_ipa,
  (not exists (
     select 1 from public.senses s
      where s.entry_id = e.id and coalesce(btrim(s.example), '') <> ''
   )) as needs_example,
  coalesce((select count(*) from public.word_request_votes v
             join public.word_requests r on r.id = v.request_id
            where r.entry_id = e.id and r.status = 'open'), 0) as votes
from public.entries e
where e.status = 'approved';

grant select on public.needs_work to anon, authenticated;

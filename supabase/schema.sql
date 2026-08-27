-- ============================================================================
--  Fuzhounese Dictionary — database schema (PRD v0.1)
--  Run in Supabase → SQL Editor → New query. Safe to run more than once.
--  Order: this file, then storage.sql, then (optionally) seed.sql.
-- ============================================================================

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
--  profiles: one row per signed-in user. is_editor is set MANUALLY by you
--  (see README). Clients cannot change it — see the column grant near the end.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_editor    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Auto-create a profile the first time someone signs in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user an editor? SECURITY DEFINER so RLS policies can
-- consult profiles without recursing into profiles' own RLS.
create or replace function public.is_editor()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_editor from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
--  entries: one row per word. Meanings live in the child table `senses`.
--    status: pending → approved → rejected
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id             uuid primary key default gen_random_uuid(),
  headword       text not null,            -- display form (usually the romanization)
  hanzi          text,                     -- 漢字 / hàn-cê, where they exist
  romanization   text,                     -- free-form (any system the contributor uses)
  ipa            text,
  audio_url      text,                     -- Supabase Storage public URL or an external link
  notes          text,
  variety        text,                     -- optional region/variety tag (see PRD Q-1)
  status         text not null default 'pending'
                   check (status in ('pending','approved','rejected')),
  contributor_id uuid references public.profiles(id) on delete set null,
  review_notes   text,                     -- editor's note back to the contributor
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz
);

-- ---------------------------------------------------------------------------
--  senses: one or more meanings per entry.
-- ---------------------------------------------------------------------------
create table if not exists public.senses (
  id             uuid primary key default gen_random_uuid(),
  entry_id       uuid not null references public.entries(id) on delete cascade,
  part_of_speech text,
  definition_en  text not null,            -- English definition (required)
  gloss_zh       text,                     -- optional Standard Chinese gloss
  example        text,                     -- example sentence (Fuzhounese)
  example_gloss  text,                     -- its translation
  sort           int not null default 0
);

create index if not exists entries_status_idx  on public.entries (status);
create index if not exists entries_created_idx  on public.entries (created_at desc);
create index if not exists entries_contrib_idx  on public.entries (contributor_id);
create index if not exists entries_headword_trgm on public.entries using gin (headword gin_trgm_ops);
create index if not exists entries_roman_trgm    on public.entries using gin (romanization gin_trgm_ops);
create index if not exists senses_entry_idx      on public.senses (entry_id);
create index if not exists senses_def_trgm       on public.senses using gin (definition_en gin_trgm_ops);

-- ---------------------------------------------------------------------------
--  Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.entries  enable row level security;
alter table public.senses   enable row level security;

-- profiles: anyone may read (needed for contributor credit); a user may
-- insert/update ONLY their own row. (is_editor is protected by a column grant.)
drop policy if exists "profiles readable"        on public.profiles;
drop policy if exists "own profile insert"       on public.profiles;
drop policy if exists "own profile update"       on public.profiles;
create policy "profiles readable"  on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert with check (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid());

-- entries: public reads approved; a contributor reads their own; editors read all.
drop policy if exists "read approved entries"     on public.entries;
drop policy if exists "read own entries"          on public.entries;
drop policy if exists "editors read all entries"  on public.entries;
drop policy if exists "authed submit entry"       on public.entries;
drop policy if exists "editors update entries"    on public.entries;
drop policy if exists "editors delete entries"    on public.entries;
create policy "read approved entries"    on public.entries for select using (status = 'approved');
create policy "read own entries"         on public.entries for select using (contributor_id = auth.uid());
create policy "editors read all entries" on public.entries for select using (public.is_editor());
-- An authenticated user may submit, but only as their own pending entry.
create policy "authed submit entry" on public.entries for insert
  with check (auth.uid() is not null and contributor_id = auth.uid() and status = 'pending');
-- Only editors may change or remove entries (approve/reject/edit).
create policy "editors update entries" on public.entries for update using (public.is_editor());
create policy "editors delete entries" on public.entries for delete using (public.is_editor());

-- senses: visibility follows the parent entry; a contributor may add senses to
-- their own pending entry; editors may do anything.
drop policy if exists "read senses of visible entries" on public.senses;
drop policy if exists "authed insert own senses"       on public.senses;
drop policy if exists "editors update senses"          on public.senses;
drop policy if exists "editors delete senses"          on public.senses;
create policy "read senses of visible entries" on public.senses for select using (
  exists (
    select 1 from public.entries e
    where e.id = senses.entry_id
      and (e.status = 'approved' or e.contributor_id = auth.uid() or public.is_editor())
  )
);
create policy "authed insert own senses" on public.senses for insert with check (
  exists (
    select 1 from public.entries e
    where e.id = senses.entry_id
      and e.contributor_id = auth.uid()
      and e.status = 'pending'
  ) or public.is_editor()
);
create policy "editors update senses" on public.senses for update using (public.is_editor());
create policy "editors delete senses" on public.senses for delete using (public.is_editor());

-- Protect is_editor from self-promotion: clients can't write these columns.
revoke update (is_editor) on public.profiles from anon, authenticated;
revoke insert (is_editor) on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------------------
--  search_entries(): ranked search over APPROVED entries, matching across the
--  entry fields and its senses. unaccent() makes tone marks optional.
--  Returns entry columns plus a short gloss for the result card.
-- ---------------------------------------------------------------------------
create or replace function public.search_entries(q text)
returns table (
  id uuid, headword text, hanzi text, romanization text, ipa text,
  audio_url text, notes text, variety text, status text,
  contributor_id uuid, created_at timestamptz, short_gloss text, pos text
)
language sql
stable
as $$
  with matched as (
    select e.*,
           (select s.definition_en from public.senses s
             where s.entry_id = e.id order by s.sort, s.id limit 1) as short_gloss,
           (select s.part_of_speech from public.senses s
             where s.entry_id = e.id order by s.sort, s.id limit 1) as pos
    from public.entries e
    where e.status = 'approved'
      and (
        unaccent(coalesce(e.headword,''))     ilike '%' || unaccent(q) || '%'
        or unaccent(coalesce(e.romanization,'')) ilike '%' || unaccent(q) || '%'
        or coalesce(e.hanzi,'')  ilike '%' || q || '%'
        or coalesce(e.ipa,'')    ilike '%' || q || '%'
        or exists (
          select 1 from public.senses s
          where s.entry_id = e.id
            and (
              s.definition_en ilike '%' || q || '%'
              or coalesce(s.gloss_zh,'') ilike '%' || q || '%'
            )
        )
      )
  )
  select id, headword, hanzi, romanization, ipa, audio_url, notes, variety,
         status, contributor_id, created_at, short_gloss, pos
  from matched
  order by
    (unaccent(lower(headword)) = unaccent(lower(q))) desc,
    headword asc
  limit 100;
$$;

-- ---------------------------------------------------------------------------
--  submit_entry(): insert a pending entry and its senses atomically, as the
--  signed-in user. SECURITY INVOKER, so the RLS policies above are what allow
--  it (auth required; contributor_id must be the caller; status must be pending).
--  Called from the client via supabase.rpc('submit_entry', {...}).
-- ---------------------------------------------------------------------------
create or replace function public.submit_entry(
  p_hanzi text,
  p_romanization text,
  p_ipa text,
  p_audio_url text,
  p_notes text,
  p_variety text,
  p_senses jsonb
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v_headword text;
  s jsonb;
  i int := 0;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to submit.';
  end if;

  v_headword := coalesce(nullif(trim(p_romanization), ''), nullif(trim(p_hanzi), ''));
  if v_headword is null then
    raise exception 'Provide at least characters or romanization.';
  end if;
  if p_senses is null or jsonb_array_length(p_senses) = 0 then
    raise exception 'Provide at least one meaning.';
  end if;

  insert into public.entries
    (headword, hanzi, romanization, ipa, audio_url, notes, variety, status, contributor_id)
  values
    (v_headword,
     nullif(trim(p_hanzi), ''),
     nullif(trim(p_romanization), ''),
     nullif(trim(p_ipa), ''),
     nullif(trim(p_audio_url), ''),
     nullif(trim(p_notes), ''),
     nullif(trim(p_variety), ''),
     'pending',
     auth.uid())
  returning id into v_id;

  for s in select * from jsonb_array_elements(p_senses)
  loop
    if coalesce(trim(s->>'definition_en'), '') = '' then
      continue;
    end if;
    insert into public.senses
      (entry_id, part_of_speech, definition_en, gloss_zh, example, example_gloss, sort)
    values
      (v_id,
       nullif(trim(s->>'part_of_speech'), ''),
       trim(s->>'definition_en'),
       nullif(trim(s->>'gloss_zh'), ''),
       nullif(trim(s->>'example'), ''),
       nullif(trim(s->>'example_gloss'), ''),
       i);
    i := i + 1;
  end loop;

  if i = 0 then
    raise exception 'At least one meaning needs an English definition.';
  end if;

  return v_id;
end;
$$;

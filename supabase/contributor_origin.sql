-- ============================================================================
--  Contributor origin — where a person's (or a word's) Fuzhounese comes from.
--  Run in Supabase → SQL Editor AFTER schema.sql. Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  profiles: the contributor's own family origin, plus how public it is.
--    origin_precision: 'hidden' (nothing shown) | 'area' (county/district only)
--                      | 'locality' (county + town/village)
--  Note: we do not KEEP what is not published — the trigger below scrubs the
--  columns to match the chosen precision on every write.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists origin_area      text;
alter table public.profiles add column if not exists origin_locality  text;
alter table public.profiles add column if not exists origin_precision text not null default 'hidden';

do $$ begin
  alter table public.profiles
    add constraint profiles_origin_precision_check
    check (origin_precision in ('hidden','area','locality'));
exception when duplicate_object then null; end $$;

create or replace function public.scrub_profile_origin()
returns trigger
language plpgsql
as $$
begin
  new.origin_area     := nullif(btrim(new.origin_area), '');
  new.origin_locality := nullif(btrim(new.origin_locality), '');

  if new.origin_area is null then
    new.origin_precision := 'hidden';
  end if;

  if new.origin_precision = 'hidden' then
    new.origin_area     := null;
    new.origin_locality := null;
  elsif new.origin_precision = 'area' then
    new.origin_locality := null;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_scrub_origin on public.profiles;
create trigger profiles_scrub_origin
  before insert or update on public.profiles
  for each row execute function public.scrub_profile_origin();

-- ---------------------------------------------------------------------------
--  entries: the origin of THIS word, which may differ from the contributor's
--  own (someone can record a word they picked up in a different county).
--  Defaults to the contributor's profile origin at submit time.
-- ---------------------------------------------------------------------------
alter table public.entries add column if not exists origin_area     text;
alter table public.entries add column if not exists origin_locality text;
create index if not exists entries_origin_area_idx on public.entries (origin_area);

-- ---------------------------------------------------------------------------
--  submit_entry(): now also records the word's origin. Old signature dropped.
-- ---------------------------------------------------------------------------
drop function if exists public.submit_entry(text, text, text, text, text, text, jsonb);

create or replace function public.submit_entry(
  p_hanzi text,
  p_romanization text,
  p_ipa text,
  p_audio_url text,
  p_notes text,
  p_variety text,
  p_senses jsonb,
  p_origin_area text default null,
  p_origin_locality text default null
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
    (headword, hanzi, romanization, ipa, audio_url, notes, variety,
     origin_area, origin_locality, status, contributor_id)
  values
    (v_headword,
     nullif(trim(p_hanzi), ''),
     nullif(trim(p_romanization), ''),
     nullif(trim(p_ipa), ''),
     nullif(trim(p_audio_url), ''),
     nullif(trim(p_notes), ''),
     nullif(trim(p_variety), ''),
     nullif(trim(p_origin_area), ''),
     nullif(trim(p_origin_locality), ''),
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

-- ---------------------------------------------------------------------------
--  search_entries(): carry the word's origin through to result cards.
-- ---------------------------------------------------------------------------
drop function if exists public.search_entries(text);

create or replace function public.search_entries(q text)
returns table (
  id uuid, headword text, hanzi text, romanization text, ipa text,
  audio_url text, notes text, variety text, status text,
  contributor_id uuid, created_at timestamptz, short_gloss text, pos text,
  origin_area text, origin_locality text
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
         status, contributor_id, created_at, short_gloss, pos,
         origin_area, origin_locality
  from matched
  order by
    (unaccent(lower(headword)) = unaccent(lower(q))) desc,
    headword asc
  limit 100;
$$;

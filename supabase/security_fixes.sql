-- ============================================================================
--  Security fixes — 2026-09-02. Run in Supabase → SQL Editor.
--  Safe to run more than once, and safe to run in ANY order relative to the
--  other migrations: the parts that touch the recordings and suggestions
--  tables only run if those tables exist, and recordings.sql / suggestions.sql
--  now carry the same fixed function bodies, so whichever file runs last
--  leaves the fixed version in place.
--
--  Three things, in order of how much they matter:
--
--   1. is_editor could be set by anyone on their own row.
--   2. A suggestion's sense_id was never checked to belong to its entry_id.
--   3. The origin stamped on recordings and suggestions could be overridden by
--      the client, which is the opposite of what a "stamp" is for.
--   4. Searching for % or _ matched everything.
-- ============================================================================


-- ---------------------------------------------------------------------------
--  1. PROFILES: anyone could make themselves an editor.
--
--  schema.sql tried to protect is_editor with a COLUMN-level revoke:
--      revoke update (is_editor) on public.profiles from authenticated;
--  Postgres does not work that way. A column-level REVOKE cannot cancel a
--  TABLE-level grant, and Supabase grants ALL on every new public table to
--  the authenticated role by default. So the revoke was a no-op and the
--  "own profile update" policy let any signed-in user run
--      update profiles set is_editor = true where id = auth.uid()
--  with the anon key that ships in the page bundle. Reproduced: UPDATE 1.
--
--  The fix is the other way round: revoke at the TABLE level, then grant back
--  only the columns a person is allowed to change. Verified: self-promotion
--  now fails with "permission denied", even when smuggled in alongside a
--  legitimate column, while display name, avatar and origin edits still work.
-- ---------------------------------------------------------------------------
revoke insert, update on public.profiles from anon, authenticated;

grant update (display_name, avatar_url, origin_area, origin_locality, origin_precision)
  on public.profiles to authenticated;

-- Belt and braces: even if a future grant reopens the table, the column cannot
-- change except from the service role (auth.uid() is null there).
create or replace function public.protect_is_editor()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and new.is_editor is distinct from old.is_editor then
    raise exception 'is_editor can only be changed by an administrator.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_editor on public.profiles;
create trigger profiles_protect_is_editor
  before update on public.profiles
  for each row execute function public.protect_is_editor();


-- ---------------------------------------------------------------------------
--  2. SUGGESTIONS: sense_id must belong to entry_id.
--
--  The only constraint was "an example has a sense_id". Nothing said which
--  entry that sense had to belong to, and apply_suggestion() is SECURITY
--  DEFINER, so an example filed against word A with a hand-edited sense_id
--  from word B would show under A in the queue and, on approval, be written
--  onto B. Fixed at both ends: reject the mismatch on insert, and make the
--  publish step refuse to write to a sense of a different entry.
-- ---------------------------------------------------------------------------
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

do $$ begin
  if to_regclass('public.suggestions') is not null then
    drop trigger if exists suggestions_check_sense on public.suggestions;
    create trigger suggestions_check_sense
      before insert or update of sense_id, entry_id on public.suggestions
      for each row execute function public.check_suggestion_sense();
  end if;
end $$;

-- Function bodies below resolve their tables at call time, so creating them
-- before suggestions.sql / recordings.sql have run is fine. Those two files
-- now define the same bodies, so running them afterwards changes nothing.
create or replace function public.apply_suggestion()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
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


-- ---------------------------------------------------------------------------
--  3. ORIGIN STAMP: the profile decides, not the client.
--
--  Both prepare_* triggers did coalesce(new.origin_area, profile) — so a value
--  sent by the client won the tie, and someone whose profile says "overseas"
--  could label a recording as Gulou. The stamp is meant to be a snapshot of
--  the profile at that moment; now it always is. Service-role inserts (import
--  scripts) may still set it explicitly.
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
    if auth.uid() is not null then
      new.origin_area     := v_area;
      new.origin_locality := v_loc;
    else
      new.origin_area     := coalesce(new.origin_area, v_area);
      new.origin_locality := coalesce(new.origin_locality, v_loc);
    end if;
  end if;

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
    if auth.uid() is not null then
      new.origin_area     := v_area;
      new.origin_locality := v_loc;
    else
      new.origin_area     := coalesce(new.origin_area, v_area);
      new.origin_locality := coalesce(new.origin_locality, v_loc);
    end if;
  end if;

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



-- ---------------------------------------------------------------------------
--  4. SEARCH: % and _ are LIKE wildcards, so searching "%" returned every word
--  and "_" matched any single character. Escape them so they match themselves.
--  Otherwise identical to the version in contributor_origin.sql, which is the
--  one currently in production (it carries origin_area / origin_locality).
-- ---------------------------------------------------------------------------
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
  with args as (
    -- backslash first, then the two wildcards
    select replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') as qe
  ),
  matched as (
    select e.*,
           (select s.definition_en from public.senses s
             where s.entry_id = e.id order by s.sort, s.id limit 1) as short_gloss,
           (select s.part_of_speech from public.senses s
             where s.entry_id = e.id order by s.sort, s.id limit 1) as pos
    from public.entries e, args
    where e.status = 'approved'
      and btrim(q) <> ''
      and (
        unaccent(coalesce(e.headword,''))     ilike '%' || unaccent(qe) || '%'
        or unaccent(coalesce(e.romanization,'')) ilike '%' || unaccent(qe) || '%'
        or coalesce(e.hanzi,'')  ilike '%' || qe || '%'
        or coalesce(e.ipa,'')    ilike '%' || qe || '%'
        or exists (
          select 1 from public.senses s
          where s.entry_id = e.id
            and (
              s.definition_en ilike '%' || qe || '%'
              or coalesce(s.gloss_zh,'') ilike '%' || qe || '%'
            )
        )
      )
  )
  select id, headword, hanzi, romanization, ipa, audio_url, notes, variety,
         status, contributor_id, created_at, short_gloss, pos,
         origin_area, origin_locality
  from matched
  order by
    (unaccent(lower(headword)) = unaccent(lower(btrim(q)))) desc,
    headword asc
  limit 100;
$$;

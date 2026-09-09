-- ============================================================================
--  search_sense.sql — result cards show the meaning that matched, 2026-09-09.
--
--  search_entries() already matches on every sense of a word (definition and
--  Chinese gloss), but it returned the FIRST sense's gloss for the card. So a
--  search for "to know" found 八 and then showed "eight" — reading as a miss.
--  Now: if a sense matched the query, that sense's gloss and part of speech
--  are returned; otherwise the first sense as before. `sense_count` lets the
--  card say how many meanings there are. Same escaping and ranking as
--  security_fixes.sql. Safe to re-run (drop + create, the return type grew).
-- ============================================================================

drop function if exists public.search_entries(text);

create or replace function public.search_entries(q text)
returns table (
  id uuid, headword text, hanzi text, romanization text, ipa text,
  audio_url text, notes text, variety text, status text,
  contributor_id uuid, created_at timestamptz, short_gloss text, pos text,
  origin_area text, origin_locality text, sense_count int
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
           -- the sense that matched, else the first
           (select s.definition_en from public.senses s, args
             where s.entry_id = e.id
             order by (s.definition_en ilike '%' || qe || '%'
                       or coalesce(s.gloss_zh,'') ilike '%' || qe || '%') desc,
                      s.sort, s.id
             limit 1) as short_gloss,
           (select s.part_of_speech from public.senses s, args
             where s.entry_id = e.id
             order by (s.definition_en ilike '%' || qe || '%'
                       or coalesce(s.gloss_zh,'') ilike '%' || qe || '%') desc,
                      s.sort, s.id
             limit 1) as pos,
           (select count(*)::int from public.senses s where s.entry_id = e.id) as sense_count
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
         origin_area, origin_locality, sense_count
  from matched
  order by
    (unaccent(lower(headword)) = unaccent(lower(btrim(q)))) desc,
    headword asc
  limit 100;
$$;

grant execute on function public.search_entries(text) to anon, authenticated;

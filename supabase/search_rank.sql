-- ============================================================================
--  search_rank.sql — search results in a sensible order, 2026-09-09.
--  Supersedes search_sense.sql (which it contains); run this one.
--
--  Two things:
--  1. The card shows the meaning that matched. search_entries() matches on
--     every sense of a word, but used to return the FIRST sense's gloss, so
--     "to know" found 八 and showed "eight". Now the matching sense's gloss
--     and part of speech come back, plus `sense_count` for a "3 meanings" tag.
--  2. Ranking. "love" used to list 手套 "glove" above 愛 because results were
--     alphabetical. Now, in order: an exact headword / romanization / 漢字
--     match; a whole-word match in an English meaning or an exact Mandarin
--     gloss; a headword or romanization that begins with the query; and only
--     then anything that merely contains it. Ties break on the shorter
--     meaning, then A–Z. Romanization matching ignores accents.
--  Safe to re-run (drop + create).
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
    select replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') as qe,
           -- the query as a regex literal, for whole-word matching
           regexp_replace(btrim(q), '([.*+?^${}()|[\]\\])', '\\\1', 'g') as qr,
           btrim(q) as qt
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
           (select count(*)::int from public.senses s where s.entry_id = e.id) as sense_count,
           case
             when unaccent(lower(coalesce(e.headword,''))) = unaccent(lower(qt))
               or unaccent(lower(coalesce(e.romanization,''))) = unaccent(lower(qt))
               or coalesce(e.hanzi,'') = qt then 0
             when exists (select 1 from public.senses s where s.entry_id = e.id
                            and (s.definition_en ~* ('\m' || qr || '\M')
                                 or coalesce(s.gloss_zh,'') = qt)) then 1
             when unaccent(coalesce(e.headword,'')) ilike unaccent(qe) || '%'
               or unaccent(coalesce(e.romanization,'')) ilike unaccent(qe) || '%'
               or coalesce(e.hanzi,'') like qe || '%' then 2
             else 3
           end as rank
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
    rank,
    length(coalesce(short_gloss, '')),
    headword asc
  limit 100;
$$;

grant execute on function public.search_entries(text) to anon, authenticated;

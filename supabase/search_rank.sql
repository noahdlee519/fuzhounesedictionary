-- ============================================================================
--  search_rank.sql — search results in a sensible order.
--  v2, 12 Sep 2026. Supersedes search_sense.sql and the first search_rank.
--  Run this one; it is safe to re-run (drop + create).
--
--  Two things:
--
--  1. The card shows the meaning that matched. search_entries() matches on
--     every sense of a word, but used to return the FIRST sense's gloss, so
--     "to know" found 八 and showed "eight". Now the matching sense's gloss
--     and part of speech come back, plus `sense_count` for a "3 meanings" tag.
--
--  2. Ranking. Results used to come back alphabetical, so "cat" opened with
--     "indicate", "delicate", "catastrophe" and "cattle", and the word for a
--     cat was pages down. Now, best first:
--
--       0  the word itself — headword, romanization or 漢字 equal to the query
--       1  a meaning that IS the query ("cat"; also "to cat", "cat (animal)",
--          "cat; feline" — articles, parentheses and the other meanings in
--          the same gloss are set aside before comparing)
--       2  the query as a whole word inside a meaning ("a young cat"), or an
--          exact Mandarin gloss
--       3  a headword, romanization or 漢字 that begins with the query
--       4  a meaning with a word that begins with the query ("cattle",
--          "catastrophe")
--       5  everything else that merely contains it ("indicate", "delicate")
--
--     Within a rank: the shorter meaning first — a one-word gloss is the
--     plain sense of a word and a long one is a usage note — then A–Z.
--     Romanization matching ignores accents, so "sieng" finds "siĕng".
-- ============================================================================

create extension if not exists unaccent;

-- The ranking asks each matching word for its meanings. Without this the
-- planner reads the whole senses table once per word, and a broad query
-- ("a", "the") takes seconds instead of a fifth of one. Measured on 6,000
-- words and 9,000 meanings: 7.6s without, 0.18s with.
create index if not exists senses_entry_id_idx on public.senses (entry_id);

-- A meaning reduced to what it means: lower case, no parenthetical note, no
-- leading article or infinitive "to". "To eat (a meal)" and "eat" become the
-- same thing, which is what makes rank 1 above work on real dictionary glosses.
create or replace function public.gloss_key(t text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
           regexp_replace(lower(coalesce(t, '')), '\(.*?\)', '', 'g'),
           '^(to|a|an|the)\s+', ''
         ));
$$;

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
    -- the query three ways: escaped for LIKE, escaped for regex, and plain
    select replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') as qe,
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
             -- 0 · the word itself
             when unaccent(lower(coalesce(e.headword,''))) = unaccent(lower(qt))
               or unaccent(lower(coalesce(e.romanization,''))) = unaccent(lower(qt))
               or coalesce(e.hanzi,'') = qt then 0
             -- 1 · a meaning that is the query. A gloss holding several
             --     meanings ("cat; feline") is split first, so each counts.
             when exists (
               select 1 from public.senses s
               cross join lateral regexp_split_to_table(coalesce(s.definition_en,''), '\s*[;,/]\s*') part
               where s.entry_id = e.id
                 and public.gloss_key(part) = public.gloss_key(qt)
                 and public.gloss_key(qt) <> ''
             ) then 1
             -- 2 · the query as a whole word inside a meaning
             when exists (select 1 from public.senses s where s.entry_id = e.id
                            and (s.definition_en ~* ('\m' || qr || '\M')
                                 or coalesce(s.gloss_zh,'') = qt)) then 2
             -- 3 · the word begins with the query
             when unaccent(coalesce(e.headword,'')) ilike unaccent(qe) || '%'
               or unaccent(coalesce(e.romanization,'')) ilike unaccent(qe) || '%'
               or coalesce(e.hanzi,'') like qe || '%' then 3
             -- 4 · a word in a meaning begins with the query
             when exists (select 1 from public.senses s where s.entry_id = e.id
                            and s.definition_en ~* ('\m' || qr)) then 4
             -- 5 · it is in there somewhere
             else 5
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

grant execute on function public.gloss_key(text) to anon, authenticated;
grant execute on function public.search_entries(text) to anon, authenticated;

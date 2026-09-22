-- ============================================================================
--  search_v3.sql — search that forgives how people actually type.
--  22 Sep 2026. Supersedes search_rank.sql (v2). Run this one in Supabase →
--  SQL Editor; it is safe to re-run (drop + create). The site works before
--  and after: it reads the new `fuzzy` column if it is there and ignores it
--  if it is not.
--
--  Measured against the live dictionary on 22 Sep, before this file:
--    "cuoi guo", "cuoiguo", "siah buong"  → nothing (romanization typed with a
--                                            space, or without the hyphen)
--    "fruits"                             → none of the "fruit" words
--    "fruti", "grandma"                   → nothing
--    "ii"                                 → shiitake, a turtle (letters
--                                            matched inside English words)
--
--  What changes:
--
--  1. Romanization and headwords are compared FOLDED: no tone marks, no case,
--     and no hyphens, spaces or apostrophes, on both sides. "cuoi guo",
--     "cuoiguo" and "cuōi-guō" are the same query. (fz_fold, below.)
--
--  2. English endings. A one-word English query also tries its plain form:
--     "fruits" → fruit, "berries" → berry, "boxes" → box, "eating" → eat,
--     "cooked" → cook, "running" → run. The plain form ranks exactly as if it
--     had been typed. (en_forms, below.)
--
--  3. Short queries. One or two Latin letters match only a whole headword, the
--     start of a romanization, or a whole English word — never letters in the
--     middle of a word.
--
--  4. Close matches. When nothing matches at all and the query is four
--     letters or more, the closest romanizations and English meanings come
--     back instead (trigram similarity, pg_trgm), with `fuzzy` = true so the
--     page can say so: "fruti" finds fruit, "grandma" finds grandmother.
--
--  The ranking from v2 is otherwise unchanged:
--    0 the word itself · 1 a meaning that IS the query · 2 the query as a
--    whole word in a meaning, or an exact Mandarin gloss · 3 a word beginning
--    with it · 4 a word in a meaning beginning with it · 5 anything else.
-- ============================================================================

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Needed by the ranking since v2; repeated so this file stands alone.
create index if not exists senses_entry_id_idx on public.senses (entry_id);

-- Unchanged from v2.
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

-- A romanization or headword reduced for comparison: tone marks off (unaccent
-- strips Bàng-uâ-cê's combining marks too, ṳ̀ and ē̤ included), lower case, and
-- no hyphens, spaces, apostrophes or middle dots.
create or replace function public.fz_fold(t text)
returns text
language sql
-- stable, not immutable: unaccent() is stable, and Postgres only inlines a
-- function whose label matches what it calls. Inlined, a pass over every
-- word costs 6 ms instead of 24 (measured).
stable
parallel safe
as $$
  select regexp_replace(unaccent(lower(coalesce(t, ''))), '[[:space:]''’‘.·‐‑–—-]+', '', 'g');
$$;

-- The same, but keeping the syllables apart: hyphens and runs of spaces become
-- one space. "siah" begins "siăh-buông" but not "siâ-huô…"; fz_fold alone
-- cannot tell those apart.
create or replace function public.fz_syll(t text)
returns text
language sql
-- stable, not immutable: unaccent() is stable, and Postgres only inlines a
-- function whose label matches what it calls. Inlined, a pass over every
-- word costs 6 ms instead of 24 (measured).
stable
parallel safe
as $$
  select btrim(regexp_replace(regexp_replace(unaccent(lower(coalesce(t, ''))), '[''’‘.·]+', '', 'g'),
                              '[[:space:]‐‑–—-]+', ' ', 'g'));
$$;

-- The forms an English query also stands for. Always includes the query
-- itself (lower case, trimmed); for a query of Latin letters, adds the plain
-- form of its last word. Forms shorter than three letters are dropped, so
-- "is" does not become "i".
create or replace function public.en_forms(q text)
returns text[]
language sql
immutable
parallel safe
as $$
  with w as (select lower(btrim(coalesce(q, ''))) as w),
  parts as (
    select w,
           -- everything before the last word, with its trailing space
           coalesce(substring(w from '^(.*\s)\S+$'), '') as head,
           coalesce(substring(w from '(\S+)$'), '') as last
    from w
  ),
  plain as (
    select w, head, last,
      case
        when last !~ '^[a-z]+$' then null
        when last ~ '[^aeiou]ies$' then regexp_replace(last, 'ies$', 'y')
        when last ~ '(s|x|z|ch|sh)es$' then regexp_replace(last, 'es$', '')
        when last ~ '[^su]s$' then regexp_replace(last, 's$', '')
        when last ~ '([bdfgklmnprtvz])\1(ing|ed)$' then regexp_replace(last, '([bdfgklmnprtvz])\1(ing|ed)$', '\1')
        when last ~ '.{3}ing$' then regexp_replace(last, 'ing$', '')
        when last ~ '.{3}ed$' then regexp_replace(last, 'ed$', '')
      end as stem
    from parts
  )
  select array(
    select distinct f from (
      select w as f from plain
      union all select head || stem from plain where stem is not null
      -- "baked" → bak and bake, "making" → mak and make
      union all select head || stem || 'e' from plain
        where stem is not null and last ~ '(ing|ed)$' and stem ~ '[^aeiou][^aeiouwxy]$'
    ) x
    where char_length(f) >= 3 or f = (select w from plain)
  );
$$;

drop function if exists public.search_entries(text);

create or replace function public.search_entries(q text)
returns table (
  id uuid, headword text, hanzi text, romanization text, ipa text,
  audio_url text, notes text, variety text, status text,
  contributor_id uuid, created_at timestamptz, short_gloss text, pos text,
  origin_area text, origin_locality text, sense_count int, fuzzy boolean
)
language sql
stable
-- The plan's estimated cost is high enough that Postgres compiles it (JIT)
-- before running it, and for a query this size the compiling takes longer
-- than the search: 159 ms with JIT, 52 ms without, for "rice" (measured).
set jit = off
as $$
  with args as (
    select
      -- the query escaped for LIKE, and plain
      replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') as qe,
      btrim(q) as qt,
      public.fz_fold(q) as qf,
      public.fz_syll(q) as qs,
      public.en_forms(q) as forms,
      -- each form as a LIKE pattern, built once rather than per meaning
      array(select '%' || replace(replace(replace(f, '\', '\\'), '%', '\%'), '_', '\_') || '%'
              from unnest(public.en_forms(q)) f) as pats,
      -- every form as one regex alternative, each escaped
      (select string_agg(regexp_replace(f, '([.*+?^${}()|[\]\\])', '\\\1', 'g'), '|')
         from unnest(public.en_forms(q)) f) as rx,
      -- one or two plain letters: whole words and word starts only
      (char_length(btrim(q)) <= 2 and octet_length(btrim(q)) = char_length(btrim(q))) as short
  ),
  matched as (
    select e.*,
           -- the sense that matched, else the first
           (select s.definition_en from public.senses s, args
             where s.entry_id = e.id
             order by (s.definition_en ~* ('\m(' || rx || ')')
                       or coalesce(s.gloss_zh,'') ilike '%' || qe || '%') desc,
                      s.sort, s.id
             limit 1) as short_gloss,
           (select s.part_of_speech from public.senses s, args
             where s.entry_id = e.id
             order by (s.definition_en ~* ('\m(' || rx || ')')
                       or coalesce(s.gloss_zh,'') ilike '%' || qe || '%') desc,
                      s.sort, s.id
             limit 1) as pos,
           (select count(*)::int from public.senses s where s.entry_id = e.id) as sense_count,
           case
             -- 0 · the word itself
             when (qf <> '' and (fold.hf = qf or fold.rf = qf))
               or coalesce(e.hanzi,'') = qt then 0
             -- 1 · a meaning that is the query (or its plain form). A gloss
             --     holding several meanings ("cat; feline") is split first.
             when exists (
               select 1 from public.senses s
               cross join lateral regexp_split_to_table(coalesce(s.definition_en,''), '\s*[;,/]\s*') part
               where s.entry_id = e.id
                 and public.gloss_key(part) <> ''
                 and public.gloss_key(part) = any (select public.gloss_key(f) from unnest(forms) f)
             ) then 1
             -- 2 · the query as a whole word inside a meaning
             when exists (select 1 from public.senses s where s.entry_id = e.id
                            and (s.definition_en ~* ('\m(' || rx || ')\M')
                                 or coalesce(s.gloss_zh,'') = qt)) then 2
             -- 3 · the word begins with the query, syllable for syllable
             when (qs <> '' and (public.fz_syll(e.headword) like qs || '%'
                                 or public.fz_syll(e.romanization) like qs || '%'))
               or coalesce(e.hanzi,'') like qe || '%' then 3
             -- 4 · a word in a meaning begins with the query
             when exists (select 1 from public.senses s where s.entry_id = e.id
                            and s.definition_en ~* ('\m(' || rx || ')')) then 4
             -- 5 · it is in there somewhere
             else 5
           end as rank
    from public.entries e
    cross join args
    -- each word's romanization and headword folded once, for every test below
    cross join lateral (
      select public.fz_fold(e.headword) as hf, public.fz_fold(e.romanization) as rf
    ) fold
    where e.status = 'approved'
      and btrim(q) <> ''
      and (
        (qf <> '' and (fold.hf like '%' || qf || '%' or fold.rf like '%' || qf || '%'))
        or coalesce(e.hanzi,'')  ilike '%' || qe || '%'
        or coalesce(e.ipa,'')    ilike '%' || qe || '%'
        or exists (
          select 1 from public.senses s
          where s.entry_id = e.id
            and (
              s.definition_en ilike any (pats)
              or coalesce(s.gloss_zh,'') ilike '%' || qe || '%'
            )
        )
      )
  ),
  exact as (
    select m.* from matched m, args
    -- A short query keeps only the word itself, a meaning that is it, a whole
    -- English word, and a romanization that starts with it ("ii" is not
    -- "shiitake").
    where not (args.short and m.rank in (4, 5))
      -- and a single letter is not an English word worth matching ("a")
      and not (char_length(args.qt) = 1 and m.rank = 2)
  ),
  -- Nothing at all: the closest romanizations and meanings instead.
  close as (
    select e.*,
           best.definition_en as short_gloss,
           best.part_of_speech as pos,
           (select count(*)::int from public.senses s where s.entry_id = e.id) as sense_count,
           greatest(similarity(public.fz_fold(e.romanization), args.qf),
                    similarity(public.fz_fold(e.headword), args.qf),
                    best.score)
             -- ties (every "mother…" meaning is 0.67 to "mothr") go to the
             -- meaning closest as a whole: "mother" before "mother and child"
             + best.whole / 10 as score
    from public.entries e
    cross join args
    cross join lateral (
      select s.definition_en, s.part_of_speech,
             word_similarity(lower(args.qt), lower(s.definition_en)) as score,
             similarity(lower(args.qt), public.gloss_key(s.definition_en)) as whole
      from public.senses s
      where s.entry_id = e.id
      order by 3 desc, 4 desc, s.sort
      limit 1
    ) best
    where e.status = 'approved'
      and char_length(args.qt) >= 4
      and not exists (select 1 from exact)
      -- Thresholds from measured typos: "fruti"→fruit 0.50, "hosptal" 0.55,
      -- "mothr" 0.67 on meanings; "ngwai"→nguāi 0.33, "cuoigo" 0.50 on
      -- romanization. Only reached when nothing matched exactly.
      and (similarity(public.fz_fold(e.romanization), args.qf) >= 0.3
           or similarity(public.fz_fold(e.headword), args.qf) >= 0.3
           or best.score >= 0.5)
  )
  -- Exact matches in rank order, or, only when there are none, close ones by
  -- how close. One ordering over both, so the order is never left to chance.
  select id, headword, hanzi, romanization, ipa, audio_url, notes, variety,
            status, contributor_id, created_at, short_gloss, pos,
            origin_area, origin_locality, sense_count, fuzzy
  from (
    (select id, headword, hanzi, romanization, ipa, audio_url, notes, variety,
            status, contributor_id, created_at, short_gloss, pos,
            origin_area, origin_locality, sense_count,
            false as fuzzy, rank::float8 as k
       from exact
      order by rank, length(coalesce(short_gloss, '')), headword asc
      limit 100)
    union all
    (select id, headword, hanzi, romanization, ipa, audio_url, notes, variety,
            status, contributor_id, created_at, short_gloss, pos,
            origin_area, origin_locality, sense_count,
            true as fuzzy, -score as k
       from close
      order by score desc, length(coalesce(short_gloss, '')), headword asc
      limit 20)
  ) r
  order by fuzzy, k, length(coalesce(short_gloss, '')), headword asc;
$$;

grant execute on function public.gloss_key(text) to anon, authenticated;
grant execute on function public.fz_fold(text) to anon, authenticated;
grant execute on function public.en_forms(text) to anon, authenticated;
grant execute on function public.search_entries(text) to anon, authenticated;

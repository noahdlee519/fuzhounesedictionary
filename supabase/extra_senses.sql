-- ============================================================================
--  Extra senses on words already in the dictionary.
--
--  The CSV importer only ever creates NEW entries — it cannot attach a sense to
--  one that already exists — so these three go in here instead. Each adds a
--  second meaning to a word that is already live, which is the point: it proves
--  a single entry can appear under more than one part of speech.
--
--  Run in Supabase → SQL Editor. Safe to run more than once: a sense that is
--  already there is skipped, and a missing entry is reported rather than
--  guessed at.
--
--  Sources, one per sense:
--   八  the printed source dictionary reads 八 baik23 "to know; to recognise",
--       a separate word from 八 "eight" that shares the character.
--   囝  the printed source has 刀囝 do53 iang31 "a small knife" — 囝 after a
--       noun is the diminutive, alongside its own meaning "child".
--   十  the printed source has 十食 "well worth eating" and 十做 "well worth
--       doing", i.e. 十 before a verb, separate from 十 "ten".
-- ============================================================================

do $$
declare
  r      record;
  v_id   uuid;
  v_next int;
  v_added int := 0;
begin
  for r in
    select * from (values
      ('八', 'verb',    'to know; to recognise; to understand', '懂'),
      ('囝', 'particle','little, small — added after a noun as a diminutive', '仔'),
      ('十', 'adverb',  'well worth ~ing; certainly able to — placed before a verb', '值得')
    ) as t(hanzi, pos, def, zh)
  loop
    select id into v_id
      from public.entries
     where hanzi = r.hanzi and status = 'approved'
     order by created_at
     limit 1;

    if v_id is null then
      raise notice 'no approved entry for % — skipped', r.hanzi;
      continue;
    end if;

    if exists (select 1 from public.senses
                where entry_id = v_id and definition_en = r.def) then
      raise notice '% already carries this sense — skipped', r.hanzi;
      continue;
    end if;

    select coalesce(max(sort), -1) + 1 into v_next
      from public.senses where entry_id = v_id;

    insert into public.senses (entry_id, part_of_speech, definition_en, gloss_zh, sort)
    values (v_id, r.pos, r.def, r.zh, v_next);

    v_added := v_added + 1;
    raise notice 'added a % sense to %', r.pos, r.hanzi;
  end loop;

  raise notice 'done — % sense(s) added', v_added;
end $$;

-- ---------------------------------------------------------------------------
--  一 siŏh is also written 蜀 in everyday Fuzhounese. That is one word with two
--  spellings, not two words, so it belongs as a note on the entry that already
--  exists rather than as a second entry meaning "one".
--  Source: the Fuzhou dialect article on Wikipedia (蜀 siŏh, /suoʔ⁵/).
-- ---------------------------------------------------------------------------
do $$
declare
  v_id   uuid;
  v_note constant text :=
    'Also written 蜀 in everyday use. 一 is the literary character; 蜀 is what you will usually see written down for the spoken word.';
begin
  select id into v_id
    from public.entries
   where hanzi = '一' and romanization = 'siŏh' and status = 'approved'
   order by created_at
   limit 1;

  if v_id is null then
    raise notice 'no approved entry for 一 siŏh — skipped';
  elsif exists (select 1 from public.entries
                 where id = v_id and notes is not null and notes like '%蜀%') then
    raise notice '一 siŏh already carries the 蜀 note — skipped';
  else
    update public.entries
       set notes = case
                     when notes is null or btrim(notes) = '' then v_note
                     else notes || ' ' || v_note
                   end
     where id = v_id;
    raise notice 'noted the 蜀 spelling on 一 siŏh';
  end if;
end $$;

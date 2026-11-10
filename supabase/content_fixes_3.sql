-- ============================================================================
--  content_fixes_3.sql — the words Noah listed on 9 Nov 2026 as missing
--  Bàng-uâ-cê (BUC) or Yngping. Yngping is worked out from the BUC on the
--  fly (src/lib/romanization.ts), so giving a word its BUC fixes both.
--
--  Run in Supabase → SQL Editor. Safe to run more than once: every update
--  checks the word's characters as well as its id, and does nothing if the
--  row has already changed.
--
--  Only readings that can be cited are written here (the standing rule for
--  this dictionary: no reconstructed pronunciations). The printed source's
--  tone-number spellings record speech with tone sandhi and initial changes
--  ("beik5 zei242" for báik-cê), so they cannot be turned into BUC by rule;
--  the ones with no citable reading are listed at the bottom for a speaker.
-- ============================================================================

begin;

-- 八字 "able to read and write": the same word as 捌字, which Wiktionary
-- gives as báik-cê (八 written for 捌, as on the printed page).
update public.entries
   set romanization = 'báik-cê', headword = 'báik-cê',
       notes = 'Pronunciation from Wiktionary (捌字, the same word; 八 is written for 捌). The printed source has beik5 zei242.'
 where id = 'c85b8551-aaa5-48e2-a214-cc3254d3044d' and hanzi = '八字' and romanization = 'beik5 zei242';

-- 卜 "will; to intend to": the Fuzhou word for "want", which Wiktionary
-- gives as buóh under 欲 (卜 is how it is usually written in Fuzhou).
update public.entries
   set romanization = 'buóh', headword = 'buóh',
       notes = 'Pronunciation from Wiktionary (欲, colloquial buóh; Fuzhou writes the word 卜). The printed source has buok23.'
 where id = '133b85b2-b01a-401f-863a-3c84a162909a' and hanzi = '卜' and romanization = 'buok23';

-- 工 "work": Wiktionary, colloquial gĕ̤ng; the dictionary's 工人, 倩工 and
-- 工工 agree.
update public.entries
   set romanization = 'gĕ̤ng', headword = 'gĕ̤ng',
       notes = 'Pronunciation from Wiktionary (工, colloquial). The printed source has gëüng44.'
 where id = 'b2ec452c-24f3-434f-ab62-efcf2ad5bab1' and hanzi = '工' and romanization = 'gëüng44';

-- 蟹 "crab": Wiktionary hâ, as in the dictionary's own 螃蟹. "chie" was
-- not a BUC spelling.
update public.entries
   set romanization = 'hâ', headword = 'hâ'
 where id = 'bcc9354a-ab59-4d4a-85e6-f96ebf681cb3' and hanzi = '蟹' and romanization = 'chie';

-- 過敏 "allergy": 過 guó (Wiktionary, and seven words here) and 敏 mīng
-- (Wiktionary).
update public.entries
   set romanization = 'guó-mīng', headword = 'guó-mīng',
       notes = 'Pronunciation from Wiktionary (過, 敏).'
 where id = '0e2d20cf-6880-4aa0-91dc-43b4ee15b971' and hanzi = '過敏' and romanization is null;

-- 鈣 "calcium": the pronunciation field held the English word. Cleared
-- until a speaker gives the reading; the word shows by its characters.
update public.entries
   set romanization = null, headword = '鈣'
 where id = 'd0b8787a-db4d-48ef-914f-49ea5d107013' and hanzi = '鈣' and romanization = 'calcium';

-- ----------------------------------------------------------------------------
--  过敏 is the same word as 過敏, added the same day by a different person
--  in simplified characters (the dictionary writes traditional). Its
--  recording (Mawei) moves to 過敏, beside the Changle one, and the copy is
--  removed. Skip this block if you would rather keep both.
-- ----------------------------------------------------------------------------
update public.recordings
   set entry_id = '0e2d20cf-6880-4aa0-91dc-43b4ee15b971'
 where id = '25a983ee-c73c-44fc-8c94-06eef9edd62b'
   and entry_id = 'ba755b0b-3183-4c1c-8d9d-a986f0b964e5';

delete from public.entries
 where id = 'ba755b0b-3183-4c1c-8d9d-a986f0b964e5' and hanzi = '过敏'
   and not exists (select 1 from public.recordings r where r.entry_id = 'ba755b0b-3183-4c1c-8d9d-a986f0b964e5');

commit;

-- Check: each word and what it reads now.
select hanzi, romanization, headword
  from public.entries
 where id in ('c85b8551-aaa5-48e2-a214-cc3254d3044d', '133b85b2-b01a-401f-863a-3c84a162909a',
              'b2ec452c-24f3-434f-ab62-efcf2ad5bab1', 'bcc9354a-ab59-4d4a-85e6-f96ebf681cb3',
              '0e2d20cf-6880-4aa0-91dc-43b4ee15b971', 'd0b8787a-db4d-48ef-914f-49ea5d107013',
              'ba755b0b-3183-4c1c-8d9d-a986f0b964e5')
 order by hanzi;

-- ============================================================================
--  Still needed from a speaker (no citable reading found on Wiktionary or in
--  this dictionary). Suggestions are built from each character's reading in
--  other words here; please confirm or correct before using them.
--
--    力草  bodily strength     printed lik31 cau31     maybe lĭk-chāu (草 is chāu or chō̤ elsewhere)
--    七灶  everywhere          printed cik5 cëü13      maybe chék-cáu
--    九早  long ago            printed gau24 ja31      maybe gāu-cā
--    乜候  when                printed mieng53 ngau242 maybe miéh-âu (乜 miéh, 候 as in 辰候)
--    垃圾筒 rubbish bin         no reading              Fuzhou 垃渣 is lă-că; 筒 is dè̤ng
--    鈣    calcium             no reading
-- ============================================================================

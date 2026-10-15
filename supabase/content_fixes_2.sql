-- ---------------------------------------------------------------------------
--  Content fixes from the 15 Oct 2026 audit (supabase/content_fixes_2.sql)
--  The audit itself is in the project doc claude/content-audit-2026-10-15.md.
--
--  1. 水果 was in twice. The copy a contributor added (no romanization,
--     the hanzi typed into the headword) goes; its recording moves onto
--     the Wiktionary entry, cuōi-guō.
--  2. 胳腋下's romanization was still cut short ("gó̤k"). Wiktionary has
--     gó̤k>gŏ̤k-lŏ̤k>ló̤k-â, i.e. citation gó̤k-lŏ̤k-â, said gŏ̤k-ló̤k-â.
--     (牙齒 "ngāi" looked cut short too, but it is right: Wiktionary gives
--     ngāi as the contraction of ngà-kī.)
--  3. Variety labels. Many Wiktionary meanings came in with a label naming
--     other Chinese varieties, e.g. "(Northern Min) end of the year" on
--     年暝. Checked against each word's Wiktionary page:
--     a. 291 meanings whose Wiktionary label includes Eastern Min (Fuzhou):
--        the importer dropped "Eastern Min" and kept the rest, so the
--        meaning is Fuzhounese and only the misleading label goes. A bare
--        character (e.g. "疒") becomes "the character component 疒".
--     b. 46 meanings whose label does NOT include Eastern Min (e.g. 起動
--        "(Zhangzhou) easily", 上好 "(PHH) alternative form of 相好") are
--        removed. One word, 橫直, has no meaning left and goes back to
--        pending for a Fuzhou meaning.
--     content_fixes.sql (Sept) removed meanings by label alone, which also
--     took Fuzhou meanings whose "Eastern Min" had been dropped. Five words
--     were left with no meaning at all; theirs are put back (4).
--  4. Meanings restored: 鴨母, 鼎巴, 雨濛, 籃籃, 穿心爿.
--  5. Eight words that were in twice under two spellings are merged into
--     one; the kept entry's notes say "Also written …". (將樣/蔣樣 are left
--     alone: their tones differ.)
--  6. Broken definitions rewritten (cut off at a colon, characters only,
--     garbled).
--  7. Meanings listed twice with only the part of speech different.
--
--  Every statement is keyed by id and checks the old state, so running the
--  file twice does nothing the second time. Run it in the SQL editor.
-- ---------------------------------------------------------------------------
begin;

-- 1. 水果 ---------------------------------------------------------------------
update public.recordings
   set entry_id = '3d669971-1e3d-40b6-8d32-09a9f8b478b3'
 where entry_id = 'be559125-deec-4dad-b3da-f31e9cbd98db';
delete from public.entries
 where id = 'be559125-deec-4dad-b3da-f31e9cbd98db' and romanization is null;

-- 2. 胳腋下 -------------------------------------------------------------------
update public.entries
   set romanization = 'gó̤k-lŏ̤k-â',
       headword     = 'gó̤k-lŏ̤k-â',
       notes        = regexp_replace(notes, 'Pronounced [^.]*\.', 'Pronounced gŏ̤k-ló̤k-â.')
 where id = 'edeedebe-6146-4c90-bb68-86c8ea5e31b7' and romanization not like '%-%';

-- 3a. Fuzhou meanings: drop the variety label, keep the meaning -------------
update public.senses
   set definition_en = regexp_replace(definition_en, '^\([^)]*\)\s*', '')
 where definition_en like '(%'
   and left(id::text, 8) = any (array[
'bbda5b81','e20a5143','c10a01df','b3fa08e1','d7f439eb','512ed652','dd6d27f2','6bce1ff6','95cffcc6','db68bdbd',
'b7a65d17','9cdf206c','cacf7ced','ef13762b','5cdd2852','f70f25ca','7039b0d4','0ae784c9','f60c88da','44b43713',
'8cc22b0f','1a1c9bd3','1f99faaf','5a21810c','fbc9204a','27adcf40','6db5a399','11b3c96b','2b40ee97','331b7315',
'93f71e3d','edd50ce8','63ebac97','b5d0c642','bd8960a3','4ad15fc2','ca1c76f5','4068adea','4bff4671','0571da6c',
'c95e3357','0a3ea2c4','9c6d561d','2ca9291a','67cded68','7475b928','df862fda','e03fffb4','fc00ba26','704a8ede',
'171176a1','39b455c6','098112b9','b54e633d','b4810b36','5f7e874b','eafc54ea','c4c037a9','fc50bd02','01864534',
'4b2c192a','a3ed2f90','71e5a985','f8046bdc','fca39bcd','4f513c81','9c9fde61','5803fab2','839bd8c1','3edbf0aa',
'269c42f7','a32dae8b','4a70f126','5b5e9e78','cc96f054','17092b37','eb41ef08','7c2477b9','4b12bce2','2a5224c6',
'18270bdc','270fbb5c','1a50a2b2','8596c57b','9b7258d1','11bb8836','e10c79c6','dfac60b5','1f78553c','75c9d131',
'f3699926','3d226216','92414f17','4b29bc9e','0f731348','e5afd364','fcb28c68','142598e9','a06b039f','78593a79',
'b2b4f93c','4874db52','a5a466fd','72d75cdb','69151c18','faed1156','08547d02','e512a11c','2bb82ee8','1d6f2b84',
'105d90b1','59e28e54','98012b9f','d4fe9205','0950ece5','694af410','97c859b4','3def3d65','bc50e6ba','79633d44',
'872ed055','98f5232a','c9fce71f','22a4c4b4','1d8cc5de','68204f37','d90e5f11','9f43047f','2408486e','7627c30a',
'70bf04db','88ab2750','b659aae9','24565b06','5c189f2c','767b815e','5c290dc6','269ee8ee','3fe9486c','08be83ad',
'4508814d','7d42e870','6a24dd06','d8da7055','5ef926e7','a4f5d830','ad331d7c','918fb0b3','f79403e6','2378acf4',
'0b29d146','d2663003','89544e5f','36eeb000','ee3f21a7','57427262','c50351e4','1bdc7ebf','f69b0933','f489fe7d',
'1e71bb2e','c8a5bd50','98da5288','81e883d8','0c473812','7719cd68','ab1d7b83','5ce276de','1a80486c','8f731cb3',
'1287d84a','d2fa3d2f','c2406352','a0bec63e','81a861d9','ef3f1832','55834065','a905796a','f9e575cb','1d4e5c77',
'00b8e2f4','f1b6b22d','2ef7c74b','c9b226fd','4d17f9e5','cf889702','e8d7e511','e07bc43b','4756e597','8b4759fb',
'00ece882','925b6e88','402e892d','beae1777','fc217392','f770bf1d','d1bbca7d','8eeb521d','d6b484ff','ddbe81f7',
'ca6324aa','90df0a61','c6d758c8','2259b858','1125e381','c4e9ec15','2a364759','c9f808ef','413f99a2','2769e1ab',
'91ee1f6a','6be01679','c0db0059','577cc2e6','f0056c5e','d0fac278','940ac00a','d7187345','e0edda79','01efe2a9',
'0f46a8fe','345643bf','c3085415','5021ed9b','db00892f','8e342da0','8415b0be','ad02ff2c','eea00b1c','b61f0f92',
'abb97bd5','43b4c699','3f84ebf2','760867d8','70492400','98443600','07b234c0','7e8cdac5','e12f3d35','7a411a22',
'873a82c4','021293d0','3437b5f2','af77a1da','fdcc2f46','662273f6','6b548164','afc1b044','869d17c7','3fd91174',
'69200d58','df19e191','c39cc489','a5ec8f51','02e6758b','6bba115a','24c72307','ae84c0c2','eb08a59e','157df725'
]);

-- 3a (cont.) the ones that keep another label, or were a bare character
update public.senses s
   set definition_en = v.d
  from (values
    ('2a449db4-2130-4047-b505-451a2039ba5d'::uuid, '(of a child) naughty, badly behaved'),
    ('9856bd0e-256f-4650-abe1-58da56bfe0fa', '(countable) small knife; pocketknife (classifier: 把)'),
    ('f13df74e-7f6d-4a28-94c3-d07081309f87', '(of weather) warm'),
    ('75c44cc5-b85f-4dcf-a9f8-12c5bd782734', '(archaic) egg white'),
    ('93bf301e-6281-46f4-bb00-71a0064509d6', 'the character component 囗'),
    ('89d3b1de-977c-419e-8101-03471858bc00', '(offensive, vulgar) bastard; idiot; son of a bitch'),
    ('a0b0490b-63b7-4108-85df-942968a13a66', '(usually in negative sentences) intentionally; deliberately'),
    ('217322ca-1ccc-4141-96f7-e2f80590b169', '(anatomy) knuckle'),
    ('52ceae3d-1499-42b4-abb6-a2065ab666c3', '(intransitive) to play a ball game'),
    ('c10e8088-b251-4b3b-a128-10f4f8b03de7', 'the character component 土'),
    ('bd8b863c-a578-4532-a871-9525264fc49f', '(derogatory, ethnic slur) Japanese person; Jap'),
    ('a045a529-5924-45a6-a784-3d4765facc5c', '(chiefly, dated) foreign country especially from Southeast Asia'),
    ('9c2c7a93-d0fb-43a9-8015-f19cceed7c8b', '(disease) cholera a severe diarrhoeal disease'),
    ('d7202516-bacf-48a3-a197-52b5dda2cc84', '(pejorative) book nerd; pedant'),
    ('49a41a04-dfff-4a23-a4dc-9e7dadd90533', '(of a house) to be on fire'),
    ('779ce154-fee9-46f0-b66d-7b0f9525cbb2', 'the character component 糹'),
    ('c13c7e29-fce8-4584-8759-423da674624c', 'the character component 疒'),
    ('56625f56-fdfa-4484-9c4e-6e2d1e32b1df', '(archaic) prisoner'),
    ('e38b0884-a335-483e-a2ac-541189066c1f', '(anatomy) lateral canthus; outer corner of the eye'),
    ('c4067ae9-4e68-42a2-8830-eeeed915feb2', 'the character component 𥫗'),
    ('938bcfee-2279-41aa-8f07-9fd5fc2e8387', '(chiefly, countable) air conditioner'),
    ('ed8e9263-cf7f-492a-8468-8312cf4495ba', '(chiefly, uncountable) air conditioning'),
    ('7ea58ac4-b0e4-4462-8107-36d0079e2d62', '(figurative) one who uses one''s power and influence to engage in large-scale embezzlement, theft or tax evasion; high-ranking corrupt officials'),
    ('21ab0d14-7350-42fe-9600-cff77cbd1d44', '(medicine) to suffer from heatstroke or sunstroke'),
    ('e5b1d87d-9113-4b05-926e-6c126fa3f166', '(impersonal) to have dew appear'),
    ('1d103f5e-f1cd-4598-bf95-a702a47850c1', '(in general) ginger'),
    ('f7380a03-e9fd-4349-bcc1-ea2c9badbdbb', '(literal) to remove; to clear; to eliminate; to dispel'),
    ('85d52e0f-c8a2-45af-aa34-fe81d9a3cd3f', '(figurative) to spread over; to spring up; to rise of an undertaking, experience, etc.'),
    ('3c04508c-973a-4c94-8913-f7ffc63dd53f', 'the character component 彳'),
    ('3b159b47-e618-47d9-bee5-e29503d085dc', '(botany) cockscomb Celosia argentea var. cristata variety, syn. Celosia cristata species'),
    ('895540be-a4e8-4a4f-b032-5686c9c2eb70', '(euphemistic) penis')
  ) as v(id, d)
 where s.id = v.id and s.definition_en like '(%' and s.definition_en <> v.d;

-- 3b. Meanings from other varieties only: removed ---------------------------
delete from public.senses
 where definition_en like '(%'
   and (left(id::text, 8) = any (array[
'7cb162b9','1e95ee14','d80c6b55','0a537187','9c4c6498','88ad8e29','b9aa53ad','f8fc23b9','9193b9ea','e287a8bd',
'430269b7','3327c9b6','aa59039b','89b51a36','14ce0922','ddb75dec','0f84ef67','d23bef08','5791ff4f','fd8ad032',
'44f57d12','cc681a3b','9e6edc5e','41900067','d089642d','8e54beed','bd607bd0','79c79313','6ebe86aa','729dab63',
'60226101','2c470a7f','be2d422a','ed9e2ac9','d6534192','13c29cdd','a6d4e734','0ed8bb18','e1b7a3e9','4268adc7',
'98d57399','bd3938ba','9568a6bf','5da66f31'
       ])
    -- 上好: two "(PHH) alternative form of 相好" senses
    or id in ('64229fe2-0969-4fe6-a753-9b203942bfe2', '11e08cd0-fb02-4c7f-b1fa-b664c62ab163'));

-- 4. Meanings put back --------------------------------------------------------
insert into public.senses (entry_id, part_of_speech, definition_en, sort)
select v.entry_id, 'noun', v.d, 0
  from (values
    ('51a2cf1d-91a0-4d1c-a890-ad3c233b8c01'::uuid, 'female duck'),                       -- 鴨母
    ('59889cb4-bb67-4f07-85f3-d0a3276fa41d', 'rice crust; crust of cooked rice'),         -- 鼎巴
    ('505391ac-e3ae-463e-9f5a-be6f5fd71274', 'drizzle'),                                  -- 雨濛
    ('736aa1b7-9d5e-4213-8d2c-f9d252e2f0cc', 'basket'),                                   -- 籃籃
    ('9f81db50-1668-448b-bfd7-993e06e83ce6', 'the character component 忄')               -- 穿心爿
  ) as v(entry_id, d)
 where exists (select 1 from public.entries e where e.id = v.entry_id)
   and not exists (select 1 from public.senses s where s.entry_id = v.entry_id);

-- 5. One entry per word: keep the first, note the other spelling, drop it ----
do $$
declare
  p record;
begin
  for p in
    select * from (values
      ('804234c1-e558-4385-a030-93b6f5ff00f8'::uuid, '09c4c9cb-3a2a-43fa-ad26-7ec6c0cb2a01'::uuid, '嘴皮'),
      ('d053ac8c-cab3-48a3-b5d9-4c76e4f4a152', '5f503356-c15e-4a4c-9d2b-e60c3797f4ff', '日熄'),
      ('06874a65-8608-4ab8-830c-b66472753aab', '40045ae7-9ad5-4147-81b8-ec081ec8eab5', '月熄'),
      ('418d7e5c-1d01-4aa1-96ab-595c7ab386db', 'f4a93fd0-8578-4a7b-8a43-2cf19b5f8876', '犬港'),
      ('d0571146-3366-4b22-bb65-bbc7b7608afc', '8496ba09-aa56-46ef-8e58-6c5b9a195ba5', '缺嘴'),
      ('932c6267-7bf6-4076-affc-1049e6e23cf4', 'fa4f9907-51e0-4a3d-84da-d0eb367e4405', '貓仔'),
      ('774b87a5-9619-437c-831d-37fee49923e8', '273948a9-3bde-4bcd-8515-7386ec8a014a', '鐵墿'),
      ('4b74ca14-fa83-498a-a52a-9fa11ad99163', 'c4a8b73e-d35c-4cff-b10e-3daf0396be58', '雞仔')
    ) as t(keep_id, drop_id, other)
  loop
    -- only while both are still there
    continue when not exists (select 1 from public.entries where id = p.keep_id)
               or not exists (select 1 from public.entries where id = p.drop_id);
    update public.entries
       set notes = btrim(coalesce(notes, '') || ' Also written ' || p.other || '.')
     where id = p.keep_id and coalesce(notes, '') not like '%Also written ' || p.other || '%';
    update public.recordings set entry_id = p.keep_id where entry_id = p.drop_id;
    delete from public.entries where id = p.drop_id;
  end loop;
end $$;

-- 6. Broken definitions --------------------------------------------------------
update public.senses s
   set definition_en = v.d
  from (values
    ('483ca24d-e0d7-43a0-8b56-a8edcf1069fa'::uuid, 'a native of a land where Chinese people have settled, especially a Malay person'), -- 番囝
    ('e3d56956-d075-4046-8c5d-5491533252ff', 'Chinese cabbage (various kinds of Brassica rapa, such as napa cabbage and bok choy)'), -- 白菜
    ('c4d9edac-a460-4b59-881b-95034e0ec161', 'short for 八仙桌, a large square table seating eight'), -- 八仙
    ('c37f6b46-83a6-4455-b595-43f43f952cd6', 'the humanities and the sciences (文科 and 理科)'), -- 文理
    ('d90975cc-ef06-4d04-8ed0-508f85cd4490', 'the character component 火'), -- 火爿
    ('3f841d90-6090-48ae-9c0e-e930517d8cd6', 'an iPhone (short for 蘋果手機)'), -- 蘋果
    ('8fd19eb7-2baf-4d7b-80ac-2956dc187b12', 'short in stature (due to young age); little'), -- 侏儒
    ('d91d226d-92b1-427a-82f2-9ca97b16f81d', 'can be used to (literally 可 "can" + 以 "by means of")') -- 可以
  ) as v(id, d)
 where s.id = v.id and s.definition_en <> v.d;

-- 7. The same meaning twice: keep the first ---------------------------------
delete from public.senses s
 where s.id in (
     'cfc067ed-ca18-4679-87c0-9b7dc9132c26',  -- 小時 hour (measure word)
     '2666e172-3096-4eb8-b92c-44def682e4e1',  -- 第三 third (noun)
     'cc0924b1-56bf-4bbb-b803-9c8de5daa2d2',  -- 第四 fourth (noun)
     '7a97b79e-c6e3-469c-b419-d38888fa9db2',  -- 第五 fifth (noun)
     '8a13c5fe-5ae4-4557-9221-7035c717adf3',  -- 第六 sixth (noun)
     'e4abbfca-5c20-4266-8177-ee886b89f1ed'   -- 黃色 yellow (adjective)
   )
   and exists (select 1 from public.senses o
                where o.entry_id = s.entry_id and o.id <> s.id
                  and lower(btrim(o.definition_en)) = lower(btrim(s.definition_en)));

-- A word left with no meaning goes back for review (橫直) -------------------
update public.entries e
   set status = 'pending',
       review_notes = 'Its only meaning came from another Chinese variety and was removed; needs a Fuzhou meaning before it can be published.'
 where e.status = 'approved'
   and not exists (select 1 from public.senses s where s.entry_id = e.id);

commit;

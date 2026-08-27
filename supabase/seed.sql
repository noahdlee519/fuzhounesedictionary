-- ============================================================================
--  Fuzhounese Dictionary — starter seed (run AFTER schema.sql)
--  ⚠️ A small STARTER SET to prove the site works end to end. Romanizations are
--     common Bàng-uâ-cê forms but vary by source/sub-dialect — review them, then
--     load your own list with the CSV importer (see README).
--  Run in Supabase → SQL Editor. These insert as approved with no contributor.
-- ============================================================================

-- Helper: insert an entry + its senses in one statement.
-- Usage pattern repeated below (one word per block).

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('nguāi','我','nguāi','ŋuɑi²⁴²','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'pronoun','I; me','我',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('nṳ̄','汝','nṳ̄','ny³³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'pronoun','you (singular)','你',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('ĭ','伊','ĭ','i⁵⁵','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'pronoun','he; she; it','他/她',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('nè̤ng','儂','nè̤ng','nøyŋ⁵³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,example,example_gloss,sort)
  select id,'noun','person; people','人','Hók-ciŭ nè̤ng','Fuzhou people',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,notes,status) values
  ('chuó','厝','chuó','tsʰuo²¹³','The everyday word for house/home.','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'noun','house; home','房子；家',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('giāng','囝','giāng','kiaŋ³³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort) values
  ((select id from e),'noun','child; son','孩子；儿子',0),
  ((select id from e),'suffix','diminutive suffix','小',1);

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('cūi','水','cūi','tsui³³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'noun','water','水',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,notes,status) values
  ('nĭk-tàu','日頭','nĭk-tàu','niʔ tʰau','Literally "day-head".','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'noun','the sun','太阳',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,status) values
  ('buáng','飯','buáng','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'noun','cooked rice; a meal','饭',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,status) values
  ('dà̤','茶','dà̤','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'noun','tea','茶',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,variety,status) values
  ('Hók-ciŭ','福州','Hók-ciŭ','houʔ tsiu','Fuzhou city','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'proper noun','Fuzhou (the city)','福州',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,notes,status) values
  ('siăh','食','siăh','siaʔ⁵','Very common everyday verb.','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,example,example_gloss,sort)
  select id,'verb','to eat','吃','Siăh buáng lāu.','Time to eat.',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('gōng','講','gōng','kouŋ³³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,example,example_gloss,sort)
  select id,'verb','to speak; to say','讲','gōng Hók-ciŭ-uâ','to speak Fuzhounese',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('kó̤','去','kó̤','kʰo²¹³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'verb','to go','去',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('lì','來','lì','li⁵³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'verb','to come','来',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,notes,status) values
  ('hō̤','好','hō̤','ho³³','Used in greetings.','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,example,example_gloss,sort)
  select id,'adjective','good; well; fine','好','Nṳ̄ hō̤!','Hello!',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('duâi','大','duâi','tuai²⁴²','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'adjective','big; large','大',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('sá̤','細','sá̤','sa²¹³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'adjective','small; little','小',0 from e;

with e as (insert into public.entries (headword,hanzi,romanization,notes,status) values
  ('siăh buáng mà̤','食飯未','siăh buáng mà̤','A common greeting — literally "eaten rice yet?".','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort)
  select id,'phrase','Have you eaten? (a greeting)','吃饭了吗？',0 from e;

-- Numbers 1–5
with e as (insert into public.entries (headword,hanzi,romanization,ipa,notes,status) values
  ('siŏh','一','siŏh','siʔ⁵','Colloquial "one"; literary form is ék.','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort) select id,'numeral','one','一',0 from e;
with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('nê','二','nê','nei²⁴²','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort) select id,'numeral','two','二',0 from e;
with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('săng','三','săng','saŋ⁵⁵','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort) select id,'numeral','three','三',0 from e;
with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('sé','四','sé','sei²¹³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort) select id,'numeral','four','四',0 from e;
with e as (insert into public.entries (headword,hanzi,romanization,ipa,status) values
  ('ngū','五','ngū','ŋu³³','approved') returning id)
insert into public.senses (entry_id,part_of_speech,definition_en,gloss_zh,sort) select id,'numeral','five','五',0 from e;

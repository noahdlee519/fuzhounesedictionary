-- ===========================================================================
--  request_fulfilment.sql — requests close themselves (23 Sep 2026)
--
--  Run once in the Supabase SQL editor, after word_requests.sql and
--  recordings.sql. Idempotent: safe to run again.
--
--  A request is either for a recording of an existing word (entry_id set) or
--  for a word that is not in the dictionary yet (entry_id null). Until now
--  both stayed open until an editor pressed "Mark done", so a word that had
--  been recorded still showed "1 asked" and still sat on the request board.
--
--  1. A recording request closes when the word gets a live recording of the
--     word itself (a headword take with status 'approved', including one
--     published by the trust window). fulfilled_by is the person who recorded.
--  2. If that word later has no live recording again (the take was deleted,
--     withdrawn or rejected), its most recent closed request reopens, votes
--     and all, unless someone has opened a new one meanwhile.
--  3. A new-word request closes when a live entry appears whose characters,
--     romanization or headword equal the requested term (ignoring case and
--     outer spaces). The request is linked to that entry. A request made in
--     English ("grandmother") cannot be matched this way; an editor still
--     marks those done by hand.
--  4. Everything already in that state is closed now (the backfill at the end).
-- ===========================================================================

-- What a request asks for, kept on the row, because a new-word request that
-- has been answered gets linked to its entry (3) and would otherwise look
-- like a recording request. Set on insert from entry_id.
alter table public.word_requests add column if not exists asks_for text
  check (asks_for in ('word', 'recording'));
update public.word_requests
   set asks_for = case when entry_id is null then 'word' else 'recording' end
 where asks_for is null;

create or replace function public.word_request_kind()
returns trigger
language plpgsql as $$
begin
  if new.asks_for is null then
    new.asks_for := case when new.entry_id is null then 'word' else 'recording' end;
  end if;
  return new;
end;
$$;

drop trigger if exists word_requests_kind on public.word_requests;
create trigger word_requests_kind
  before insert on public.word_requests
  for each row execute function public.word_request_kind();

-- Does this word have a live recording of the word itself?
create or replace function public.entry_has_voice(p_entry uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.entries e
                  where e.id = p_entry and coalesce(btrim(e.audio_url), '') <> '')
      or exists (select 1 from public.recordings r
                  where r.entry_id = p_entry and r.kind = 'headword' and r.status = 'approved');
$$;

-- 1 and 2: after any change to a recording, bring its word's request in line.
create or replace function public.sync_recording_request()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_entry uuid := coalesce(new.entry_id, old.entry_id);
  v_reopen uuid;
begin
  if public.entry_has_voice(v_entry) then
    update public.word_requests
       set status = 'fulfilled',
           fulfilled_at = now(),
           fulfilled_by = case when tg_op <> 'DELETE' and new.kind = 'headword' and new.status = 'approved'
                               then new.contributor_id end
     where entry_id = v_entry and status = 'open' and asks_for = 'recording';
  elsif not exists (select 1 from public.word_requests where entry_id = v_entry and status = 'open') then
    -- Only a recording request is reopened. A new-word request linked to
    -- this entry (3) asked for the word to exist, which it still does.
    select id into v_reopen
      from public.word_requests
     where entry_id = v_entry and status = 'fulfilled' and asks_for = 'recording'
     order by fulfilled_at desc nulls last
     limit 1;
    if v_reopen is not null then
      update public.word_requests
         set status = 'open', fulfilled_at = null, fulfilled_by = null
       where id = v_reopen;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists recordings_sync_request on public.recordings;
create trigger recordings_sync_request
  after insert or delete or update of status, kind, entry_id on public.recordings
  for each row execute function public.sync_recording_request();

-- 3: a word goes live; close any request for it by name, and link it.
create or replace function public.fulfil_word_requests()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    update public.word_requests r
       set status = 'fulfilled',
           fulfilled_at = now(),
           fulfilled_by = new.contributor_id,
           entry_id = new.id
     where r.asks_for = 'word'
       and r.entry_id is null
       and r.status = 'open'
       and lower(btrim(r.term)) in (lower(btrim(coalesce(new.hanzi, ''))),
                                    lower(btrim(coalesce(new.romanization, ''))),
                                    lower(btrim(new.headword)))
       and btrim(r.term) <> '';
  end if;
  return null;
end;
$$;

drop trigger if exists entries_fulfil_requests on public.entries;
create trigger entries_fulfil_requests
  after insert or update of status on public.entries
  for each row execute function public.fulfil_word_requests();

-- 4: backfill.
-- Recording requests on words that already have a live recording.
update public.word_requests r
   set status = 'fulfilled', fulfilled_at = now()
 where r.status = 'open' and r.asks_for = 'recording' and public.entry_has_voice(r.entry_id);

-- New-word requests for words that are already in the dictionary. Where
-- several entries match, the oldest is linked.
update public.word_requests r
   set status = 'fulfilled',
       fulfilled_at = now(),
       entry_id = (
         select e.id from public.entries e
          where e.status = 'approved'
            and lower(btrim(r.term)) in (lower(btrim(coalesce(e.hanzi, ''))),
                                         lower(btrim(coalesce(e.romanization, ''))),
                                         lower(btrim(e.headword)))
          order by e.created_at
          limit 1)
 where r.status = 'open' and r.asks_for = 'word' and r.entry_id is null and btrim(r.term) <> ''
   and exists (
         select 1 from public.entries e
          where e.status = 'approved'
            and lower(btrim(r.term)) in (lower(btrim(coalesce(e.hanzi, ''))),
                                         lower(btrim(coalesce(e.romanization, ''))),
                                         lower(btrim(e.headword))));

-- Confirm: what is still open, and why.
select asks_for, status, count(*)
  from public.word_requests group by 1, 2 order by 1, 2;

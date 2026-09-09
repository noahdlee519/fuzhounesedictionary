-- ---------------------------------------------------------------------------
--  entries.updated_at: when a word's content last changed.
--
--  Set by triggers, never by the app: an edit to the entry row's content
--  columns, or any change to one of its senses, stamps now(). Status and
--  review columns do not count — approving a word is not editing it, and
--  "date edited" on /learn would otherwise equal "date added" for every word
--  that was ever reviewed. Backfilled to created_at so existing rows sort
--  sensibly. Safe to re-run.
-- ---------------------------------------------------------------------------

alter table public.entries
  add column if not exists updated_at timestamptz not null default now();

update public.entries set updated_at = created_at where updated_at > created_at + interval '1 second'
  and not exists (select 1 from pg_trigger where tgname = 'entries_touch_updated_at');

create index if not exists entries_updated_idx on public.entries (updated_at desc);

create or replace function public.entries_touch_updated_at()
returns trigger language plpgsql as $$
begin
  if (new.headword, new.hanzi, new.romanization, new.ipa, new.audio_url, new.notes,
      new.variety, new.origin_area, new.origin_locality)
     is distinct from
     (old.headword, old.hanzi, old.romanization, old.ipa, old.audio_url, old.notes,
      old.variety, old.origin_area, old.origin_locality) then
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists entries_touch_updated_at on public.entries;
create trigger entries_touch_updated_at
  before update on public.entries
  for each row execute function public.entries_touch_updated_at();

-- A sense changing is the entry changing. Runs as definer so it can stamp the
-- parent even when the caller's own row-level rights on entries are narrower.
create or replace function public.senses_touch_entry()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.entries set updated_at = now()
    where id = coalesce(new.entry_id, old.entry_id)
      and created_at < now() - interval '2 seconds';  -- not while the entry is being created
  return null;
end $$;

drop trigger if exists senses_touch_entry on public.senses;
create trigger senses_touch_entry
  after insert or update or delete on public.senses
  for each row execute function public.senses_touch_entry();

-- ============================================================================
--  Permission fixes from the 21 Sep 2026 role audit. Run in Supabase → SQL
--  Editor AFTER suggestions.sql, security_fixes.sql and suggest_edit.sql.
--  Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. entries.audio_url, like recordings.audio_url (recording_url_check.sql):
--     a signed-in user may only point it at their own file in this project's
--     audio bucket. Add a word sends it empty and records separately, so the
--     only thing this stops is a hand-made request naming another person's
--     file or an outside address — which an editor's play button would fetch,
--     and which "Delete entry" would then remove from storage.
-- ---------------------------------------------------------------------------
create or replace function public.check_entry_audio_url()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_editor() then
    return new;
  end if;
  new.audio_url := nullif(btrim(new.audio_url), '');
  if new.audio_url is not null
     and new.audio_url !~ ('^https://([a-z0-9-]+\.supabase\.co|[a-z0-9.-]+\.fuzhounese\.org)/storage/v1/object/public/audio/'
                           || auth.uid()::text || '/[^/?#]+$')
  then
    new.audio_url := null;
  end if;
  return new;
end;
$$;

drop trigger if exists entries_check_audio_url on public.entries;
create trigger entries_check_audio_url
  before insert or update of audio_url on public.entries
  for each row execute function public.check_entry_audio_url();

-- ---------------------------------------------------------------------------
--  2. An editor's own "Suggest an edit" or "Report" still goes to the review
--     queue. prepare_suggestion() publishes an editor's suggestions at once,
--     which is right for IPA and example sentences (applying them is the
--     point) but made an edit or a report vanish: nothing applies them, and
--     the queue lists only pending rows. This runs after prepare_suggestion
--     (triggers fire in name order) and puts those two kinds back to pending.
-- ---------------------------------------------------------------------------
create or replace function public.keep_notes_pending()
returns trigger
language plpgsql
as $$
begin
  if new.kind in ('edit','report') then
    new.status := 'pending';
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists suggestions_zz_keep_notes_pending on public.suggestions;
create trigger suggestions_zz_keep_notes_pending
  before insert on public.suggestions
  for each row execute function public.keep_notes_pending();

-- ---------------------------------------------------------------------------
--  3. A word an editor adds is published at once, as their recordings and
--     suggestions already are. submit_entry() writes every new word as
--     pending; this lifts an editor's to approved on the way in. Everyone
--     else's still waits for review.
-- ---------------------------------------------------------------------------
create or replace function public.publish_editor_entry()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and public.is_editor() and new.status = 'pending' then
    new.status := 'approved';
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists entries_publish_editor on public.entries;
create trigger entries_publish_editor
  before insert on public.entries
  for each row execute function public.publish_editor_entry();

-- ---------------------------------------------------------------------------
--  4. Let 3 through. Row-level security checks a new row AFTER the before-
--     insert triggers have run, so the "authed submit entry" policy (from
--     schema.sql) saw an editor's word already lifted to approved, and its
--     status = 'pending' rule refused it: with 3 in place, an editor could not
--     add a word at all. An editor's row may now be approved on the way in;
--     everyone else's must still be pending, and still their own.
-- ---------------------------------------------------------------------------
drop policy if exists "authed submit entry" on public.entries;
create policy "authed submit entry" on public.entries for insert
  with check (
    auth.uid() is not null
    and contributor_id = auth.uid()
    and (status = 'pending' or public.is_editor())
  );

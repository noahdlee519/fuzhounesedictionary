-- ============================================================================
--  comments.sql — comments on words and recordings (Noah, 10 Nov 2026).
--
--  Run once in Supabase → SQL Editor, after security_fixes_2.sql. Safe to run
--  more than once. Until it has run, the word pages simply show no comments
--  section and the review count ignores comments.
--
--  A comment belongs to a word, and optionally to one recording of it. It
--  goes live when it is posted, like a recording, and waits for an editor
--  to read it (reviewed_at): those unread comments count toward the red
--  number on Contribute that editors see, and appear on the Review page with
--  "Read" and "Delete". An editor's own comments count as read.
-- ============================================================================

create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.entries(id) on delete cascade,
  recording_id uuid references public.recordings(id) on delete cascade,
  -- An account's comments go with the account (privacy page: deleting an
  -- account removes what was not published as dictionary content).
  author_id    uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists comments_entry_idx on public.comments (entry_id, created_at);
create index if not exists comments_unread_idx on public.comments (created_at) where reviewed_at is null;

-- ---------------------------------------------------------------------------
--  Who may do what. Reads follow what the reader can see: a comment shows
--  wherever its word (and its recording, if it is on one) is visible to that
--  person — the subqueries run under the reader's own row rules.
-- ---------------------------------------------------------------------------
alter table public.comments enable row level security;

drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments for select using (
  exists (select 1 from public.entries e where e.id = comments.entry_id)
  and (recording_id is null
       or exists (select 1 from public.recordings r where r.id = comments.recording_id))
);

drop policy if exists "comments own insert" on public.comments;
create policy "comments own insert" on public.comments for insert with check (
  auth.uid() is not null
  and author_id = auth.uid()
  and exists (select 1 from public.entries e where e.id = comments.entry_id)
  and (recording_id is null
       or exists (select 1 from public.recordings r
                   where r.id = comments.recording_id and r.entry_id = comments.entry_id))
);

-- Your own comment you may take back; an editor may remove any.
drop policy if exists "comments own delete" on public.comments;
create policy "comments own delete" on public.comments for delete
  using (author_id = auth.uid() or public.is_editor());

-- Marking read is done by the site's editor actions (service role); nobody
-- edits a comment's text after posting.
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;

-- ---------------------------------------------------------------------------
--  On posting: the database sets the time and the read state, whatever the
--  browser sent; and a person may post at most 5 a minute and 50 a day.
-- ---------------------------------------------------------------------------
create or replace function public.prepare_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n   int;
begin
  new.body := btrim(new.body);
  if v_uid is null then
    return new;            -- service role (imports, editor actions)
  end if;
  new.created_at := now();
  new.reviewed_at := case when public.is_editor() then now() else null end;
  if public.is_editor() then
    return new;
  end if;

  select count(*) into v_n from public.comments
   where author_id = v_uid and created_at > now() - interval '1 minute';
  if v_n >= 5 then
    raise exception 'That is a lot of comments in a very short time. Please wait a moment and try again.'
      using errcode = 'check_violation';
  end if;

  select count(*) into v_n from public.comments
   where author_id = v_uid and created_at > now() - interval '24 hours';
  if v_n >= 50 then
    raise exception 'You have posted % comments today, which is the daily limit. Please carry on tomorrow.', v_n
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_prepare on public.comments;
create trigger comments_prepare
  before insert on public.comments
  for each row execute function public.prepare_comment();

-- Check: the table is there and empty or holding what was posted.
select count(*) as comments, count(*) filter (where reviewed_at is null) as unread from public.comments;

-- ============================================================================
--  Who is speaking? — a recording can be of someone other than the account
--  that made it. Run in Supabase → SQL Editor AFTER recordings.sql,
--  security_fixes.sql and recording_note.sql. Safe to run more than once.
--
--  The case this is for: a grandchild with the account, a grandmother with
--  the Fuzhounese. Until now every recording was credited to, and labelled
--  with the origin of, the person signed in. Now the recorder can say
--  "someone else", give a name (as they want it shown — "my grandmother",
--  "Ah Ma", a first name) and where that person's Fuzhounese is from.
--
--  What stays true:
--    * contributor_id is still the account that made the recording; it is
--      what the per-word cap, the rate limits and the review queue key on.
--    * with no speaker named, the origin is still stamped from the profile,
--      whatever the client sends (security_fixes.sql §3).
--    * with a speaker named, the origin sent is kept — it is that person's,
--      not the account's — but only one of the known area codes, or none.
-- ============================================================================

alter table public.recordings add column if not exists speaker_name text;

do $$ begin
  alter table public.recordings add constraint recordings_speaker_name_len
    check (speaker_name is null or char_length(speaker_name) between 1 and 60);
exception when duplicate_object then null; end $$;

-- The area codes the site knows (src/lib/origins.ts). Kept here too so a
-- hand-made request cannot label a recording with a place that does not exist.
create or replace function public.is_origin_area(p text)
returns boolean
language sql immutable
as $$
  select p in ('gulou','taijiang','cangshan','mawei','jinan','fuzhou_unsure',
               'changle','fuqing','minhou','lianjiang','luoyuan','minqing',
               'yongtai','pingtan','gutian','pingnan',
               'matsu','ningde','fujian_other','overseas')
$$;

create or replace function public.prepare_recording()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_area text;
  v_loc  text;
begin
  new.speaker_name := nullif(btrim(new.speaker_name), '');

  if new.speaker_name is not null and auth.uid() is not null then
    -- Someone else is speaking: keep the origin sent for them, if it is a
    -- real place; never fall back to the account's own origin, which would
    -- label the grandmother with the grandchild's district.
    new.origin_area := nullif(btrim(new.origin_area), '');
    if new.origin_area is not null and not public.is_origin_area(new.origin_area) then
      new.origin_area := null;
    end if;
    new.origin_locality := case when new.origin_area is null then null
                                else nullif(left(btrim(new.origin_locality), 60), '') end;
  elsif new.contributor_id is not null then
    select origin_area, origin_locality into v_area, v_loc
      from public.profiles where id = new.contributor_id;
    if auth.uid() is not null then
      new.origin_area     := v_area;
      new.origin_locality := v_loc;
    else
      new.origin_area     := coalesce(new.origin_area, v_area);
      new.origin_locality := coalesce(new.origin_locality, v_loc);
    end if;
  end if;

  if auth.uid() is null or public.is_editor() then
    new.status := coalesce(nullif(new.status, 'pending'), 'approved');
    if new.status = 'approved' then
      new.reviewed_at := coalesce(new.reviewed_at, now());
    end if;
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$;

-- The contributor may still change only the note afterwards (recording_note.sql);
-- the speaker is added to the columns they cannot change.
create or replace function public.protect_recording_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_editor() then
    return new;
  end if;
  if new.entry_id        is distinct from old.entry_id
  or new.kind            is distinct from old.kind
  or new.sense_id        is distinct from old.sense_id
  or new.audio_url       is distinct from old.audio_url
  or new.seconds         is distinct from old.seconds
  or new.contributor_id  is distinct from old.contributor_id
  or new.origin_area     is distinct from old.origin_area
  or new.origin_locality is distinct from old.origin_locality
  or new.speaker_name    is distinct from old.speaker_name
  or new.status          is distinct from old.status
  or new.review_notes    is distinct from old.review_notes
  or new.created_at      is distinct from old.created_at
  or new.reviewed_at     is distinct from old.reviewed_at
  then
    raise exception 'Only the note on a recording can be changed by its contributor.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

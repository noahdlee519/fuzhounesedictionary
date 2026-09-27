-- ===========================================================================
--  audit_fixes.sql — checks the database was missing (26 Sep 2026 audit)
--
--  Run once in the Supabase SQL editor, after origin_required.sql.
--  Idempotent: safe to run again.
--
--  The site's own forms already validate all of this. These are for a
--  request that does not come through them: anyone signed in can call the
--  database directly with the public key and their own session, and the
--  profile columns below are ones they are allowed to write.
--
--  1. profiles.avatar_url may only be a picture in this site's avatars
--     bucket, in the person's own folder, or the picture from their own
--     Google sign-in. Anything else was a way to put any address on the
--     internet into an <img> on the home page, so whoever runs it would log
--     the IP of every visitor (the same hole recording_url_check.sql closed
--     for recordings).
--  2. profiles.origin_area and entries.origin_area must be one of the
--     site's own area codes (src/lib/origins.ts); display_name and
--     origin_locality get the same length caps as the account form.
--  3. The origin rule from origin_required.sql, with its own message when
--     it is a named speaker ("someone else") whose place is missing, rather
--     than telling the account holder to fix their account page.
-- ===========================================================================

-- The area codes the site knows. Same list as recording_speaker.sql; kept
-- here so this file does not depend on that one having been run.
create or replace function public.is_origin_area(p text)
returns boolean
language sql immutable
as $$
  select p in ('gulou','taijiang','cangshan','mawei','jinan','fuzhou_unsure',
               'changle','fuqing','minhou','lianjiang','luoyuan','minqing',
               'yongtai','pingtan','gutian','pingnan',
               'matsu','ningde','fujian_other','overseas')
$$;

-- 1 and 2: profiles.
create or replace function public.check_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_meta jsonb;
begin
  -- The service role (sign-up trigger, imports, account deletion) passes.
  if auth.uid() is null then
    return new;
  end if;

  new.display_name    := left(new.display_name, 80);
  new.origin_locality := left(new.origin_locality, 120);

  if new.origin_area is not null and not public.is_origin_area(new.origin_area) then
    raise exception 'That is not one of the places on the list.'
      using errcode = 'check_violation';
  end if;

  if new.avatar_url is not null
     and (tg_op = 'INSERT' or new.avatar_url is distinct from old.avatar_url) then
    select raw_user_meta_data into v_meta from auth.users where id = new.id;
    -- coalesce: with no Google picture the comparisons are null, and
    -- "not (false or null)" is null, which an IF treats as false — the
    -- check would let anything through.
    if not (
         new.avatar_url ~ ('^https://([a-z0-9-]+\.supabase\.co|[a-z0-9.-]+\.fuzhounese\.org)/storage/v1/object/public/avatars/'
                           || new.id::text || '/[^/?#]+$')
      or coalesce(new.avatar_url = v_meta->>'avatar_url', false)
      or coalesce(new.avatar_url = v_meta->>'picture', false)
    ) then
      raise exception 'That picture is not from this site''s own storage.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_check_fields on public.profiles;
create trigger profiles_check_fields
  before insert or update on public.profiles
  for each row execute function public.check_profile_fields();

-- 2: a word's own origin.
create or replace function public.check_entry_origin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.origin_area := nullif(btrim(new.origin_area), '');
  if new.origin_area is not null and not public.is_origin_area(new.origin_area) then
    new.origin_area := null;
  end if;
  new.origin_locality := case when new.origin_area is null then null
                              else nullif(left(btrim(new.origin_locality), 120), '') end;
  return new;
end;
$$;

drop trigger if exists entries_check_origin on public.entries;
create trigger entries_check_origin
  before insert or update of origin_area, origin_locality on public.entries
  for each row execute function public.check_entry_origin();

-- 3: the origin rule, with the right message for a named speaker.
create or replace function public.require_origin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_area text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'entries' then
    select origin_area into v_area from public.profiles where id = auth.uid();
  else
    v_area := new.origin_area;
  end if;

  if v_area is null then
    -- Nested, not "and": a condition that names new.speaker_name would fail
    -- on the tables that have no such column.
    if tg_table_name = 'recordings' then
      if new.speaker_name is not null then
        raise exception 'Choose where the speaker''s Fuzhounese is from.'
          using errcode = 'check_violation', hint = 'speaker_origin_required';
      end if;
    end if;
    raise exception 'Tell us where your Fuzhounese is from (on your account page) before contributing.'
      using errcode = 'check_violation', hint = 'origin_required';
  end if;
  return new;
end;
$$;

-- Confirm: any existing values these checks would now refuse (fix by hand
-- if there are any; nothing here changes existing rows).
select 'profiles with an unknown origin code' as problem, count(*) from public.profiles
 where origin_area is not null and not public.is_origin_area(origin_area)
union all
select 'profiles with an outside picture', count(*) from public.profiles p
  join auth.users u on u.id = p.id
 where p.avatar_url is not null
   and p.avatar_url !~ '/storage/v1/object/public/avatars/'
   and p.avatar_url is distinct from u.raw_user_meta_data->>'avatar_url'
   and p.avatar_url is distinct from u.raw_user_meta_data->>'picture';

-- ============================================================================
--  Abuse limits — submission rate caps + server-side audio limits.
--  Run in Supabase → SQL Editor AFTER schema.sql, storage.sql, word_requests.sql
--  and contributor_origin.sql. Safe to run more than once.
--
--  Design notes:
--   * Enforced by BEFORE INSERT triggers, not inside submit_entry(), so every
--     insert path is covered and submit_entry() never has to be redefined.
--   * SECURITY DEFINER so the counts cannot be dodged by RLS hiding rows.
--   * auth.uid() IS NULL means service role (the bulk import script, editor
--     server actions) — those skip the limits deliberately.
--   * Editors skip the limits.
--   * Tune the numbers in the two "limits" blocks below; nothing else needs
--     changing.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  entries: three caps, each catching a different abuse shape.
--    pending  — protects the moderation queue, and self-heals as it is worked
--    per day  — caps sustained volume
--    per min  — caps a scripted burst
-- ---------------------------------------------------------------------------
create or replace function public.enforce_entry_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  max_pending  constant int := 100;
  max_per_day  constant int := 40;
  max_per_min  constant int := 5;
  v_uid uuid := auth.uid();
  v_n   int;
begin
  -- service role (import script, editor actions) and editors are exempt
  if v_uid is null or public.is_editor() then
    return new;
  end if;

  select count(*) into v_n
    from public.entries
    where contributor_id = v_uid and status = 'pending';
  if v_n >= max_pending then
    raise exception
      'You have % words still waiting for review. Once an editor has worked through them you can add more.',
      v_n using errcode = 'check_violation';
  end if;

  select count(*) into v_n
    from public.entries
    where contributor_id = v_uid and created_at > now() - interval '24 hours';
  if v_n >= max_per_day then
    raise exception
      'You have added % words in the last day, which is the daily limit. Please carry on tomorrow.',
      v_n using errcode = 'check_violation';
  end if;

  select count(*) into v_n
    from public.entries
    where contributor_id = v_uid and created_at > now() - interval '1 minute';
  if v_n >= max_per_min then
    raise exception
      'That is a lot of words in a very short time. Please wait a moment and try again.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists entries_rate_limit on public.entries;
create trigger entries_rate_limit
  before insert on public.entries
  for each row execute function public.enforce_entry_rate_limit();

-- ---------------------------------------------------------------------------
--  word_requests: the board is public and cheap to post to, so cap it too.
--  (Duplicate open requests are already blocked by partial-unique indexes, and
--  votes by the composite primary key, so only distinct new terms need a cap.)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_request_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  max_per_day constant int := 20;
  max_per_min constant int := 3;
  v_uid uuid := auth.uid();
  v_n   int;
begin
  if v_uid is null or public.is_editor() then
    return new;
  end if;

  select count(*) into v_n
    from public.word_requests
    where requested_by = v_uid and created_at > now() - interval '24 hours';
  if v_n >= max_per_day then
    raise exception
      'You have requested % words in the last day, which is the daily limit. Please carry on tomorrow.',
      v_n using errcode = 'check_violation';
  end if;

  select count(*) into v_n
    from public.word_requests
    where requested_by = v_uid and created_at > now() - interval '1 minute';
  if v_n >= max_per_min then
    raise exception
      'That is a lot of requests in a very short time. Please wait a moment and try again.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists word_requests_rate_limit on public.word_requests;
create trigger word_requests_rate_limit
  before insert on public.word_requests
  for each row execute function public.enforce_request_rate_limit();

-- ---------------------------------------------------------------------------
--  Audio bucket: enforce the 5 MB cap and audio-only uploads in the STORAGE
--  layer. The browser also checks size (MAX_AUDIO_BYTES in src/lib/constants),
--  but a client-side check is advice, not a limit — this is the real one.
--  Keep 5242880 in step with MAX_AUDIO_BYTES.
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array[
      'audio/mpeg','audio/mp3','audio/mp4','audio/aac','audio/x-m4a','audio/m4a',
      'audio/wav','audio/x-wav','audio/vnd.wave','audio/webm','audio/ogg',
      'audio/opus','audio/flac','audio/x-flac'
    ]
where id = 'audio';

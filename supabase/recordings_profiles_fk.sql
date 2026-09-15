-- ============================================================================
--  recordings → profiles: restore the relationship PostgREST needs.
--  Run in Supabase → SQL Editor. Safe to run more than once.
--
--  THE SYMPTOM
--  Every page that asked for a recording and its speaker in one request came
--  back with nothing, and each page then rendered its empty state rather than
--  an error: the word page said "be the first to say this word" on words with
--  several recordings, the home page and the Contribute page showed no recent
--  recordings, and the editors' recording queue would not load. Meanwhile the
--  same recordings counted correctly everywhere that did not ask for the
--  speaker in the same breath — the About page's totals, Top contributors,
--  and each contributor's own page.
--
--  THE CAUSE
--  PostgREST will only embed one table in another when a foreign key tells it
--  how they are related. recordings.contributor_id is declared to reference
--  profiles(id) in supabase/recordings.sql — but that file creates the table
--  with `create table if not exists`, so if public.recordings already existed
--  when the reference was added, running the file again changed nothing and
--  the constraint was never created. Joins that do not involve this pair are
--  unaffected, which is why only this one shape failed.
--
--  The application no longer depends on this join — it looks the speakers up
--  by id — so this migration is not required for the site to work. Run it
--  anyway: it is the difference between a repaired relationship and a
--  permanent workaround, and it makes `recordings(..., profiles(...))` usable
--  again in the SQL editor and in anything written later.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. What is actually there. Read this output before and after.
-- ---------------------------------------------------------------------------
select conname as constraint_name,
       pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.recordings'::regclass
   and contype = 'f'
 order by conname;
-- Expected once repaired: a row whose definition reads
--   FOREIGN KEY (contributor_id) REFERENCES profiles(id) ON DELETE SET NULL

-- ---------------------------------------------------------------------------
--  2. Add it if it is missing.
--
--  Any row pointing at a profile that is no longer there would block the
--  constraint, so those are cleared first — contributor_id is nullable and
--  already means "no name to show". NOT VALID + VALIDATE keeps the table
--  readable while the existing rows are checked.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.recordings'::regclass
       and contype  = 'f'
       and conkey   = array[(select attnum from pg_attribute
                              where attrelid = 'public.recordings'::regclass
                                and attname  = 'contributor_id')]
  ) then
    update public.recordings r
       set contributor_id = null
     where r.contributor_id is not null
       and not exists (select 1 from public.profiles p where p.id = r.contributor_id);

    alter table public.recordings
      add constraint recordings_contributor_id_fkey
      foreign key (contributor_id) references public.profiles(id)
      on delete set null
      not valid;

    alter table public.recordings validate constraint recordings_contributor_id_fkey;

    raise notice 'recordings_contributor_id_fkey created.';
  else
    raise notice 'A foreign key on recordings.contributor_id already exists; nothing to do.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
--  3. Tell PostgREST to look again. Without this the API keeps serving the
--     old picture of the schema and the join still fails until it restarts.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
--  4. Confirm. This should return a row rather than an error once the schema
--     cache has reloaded (give it a few seconds).
-- ---------------------------------------------------------------------------
select r.id, r.contributor_id, p.display_name
  from public.recordings r
  left join public.profiles p on p.id = r.contributor_id
 limit 3;

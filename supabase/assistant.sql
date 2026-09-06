-- ============================================================================
--  Assistant — usage ledger for "Ask the dictionary". Run in Supabase → SQL
--  Editor. Safe to run more than once. Needs nothing else first.
--
--  One row per answered question, with what it cost. The site reads the
--  day's totals before every call and refuses when either cap is reached:
--    5 cents per person per day  (ASSISTANT_CAP_ACTOR_MICROCENTS in the code)
--    5 dollars per day in total  (ASSISTANT_CAP_TOTAL_MICROCENTS)
--  Costs are kept in microcents (1 cent = 1,000,000) so fractions of a cent
--  add up exactly.
--
--  "actor" is the signed-in user's id, or a salted hash of the visitor's IP
--  address for someone not signed in. The question and answer are kept so the
--  questions the assistant could not answer can be read back — that list is a
--  to-do list for the dictionary. Nothing here is readable by the anon or
--  authenticated roles: only the service role, from the server.
-- ============================================================================

create table if not exists public.assistant_usage (
  id              bigint generated always as identity primary key,
  day             date not null default (now() at time zone 'utc')::date,
  actor           text not null,
  user_id         uuid references public.profiles(id) on delete set null,
  question        text not null,
  answer          text,
  -- what the assistant said it could not find, if anything (null = answered)
  gap             text,
  model           text,
  input_tokens    int not null default 0,
  cached_tokens   int not null default 0,
  output_tokens   int not null default 0,
  cost_microcents bigint not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists assistant_usage_day_actor_idx on public.assistant_usage (day, actor);
create index if not exists assistant_usage_day_idx       on public.assistant_usage (day);
create index if not exists assistant_usage_gap_idx       on public.assistant_usage (day) where gap is not null;

alter table public.assistant_usage enable row level security;
-- No policies and no grants: the service role bypasses RLS, everyone else is
-- locked out. Belt and braces against Supabase's default table grants.
revoke all on public.assistant_usage from anon, authenticated;
grant all on public.assistant_usage to service_role;

-- Today's spend for one actor and for everyone, in one round trip.
create or replace function public.assistant_spend(p_actor text)
returns table (actor_microcents bigint, total_microcents bigint)
language sql
stable
security definer set search_path = public
as $$
  select
    coalesce(sum(cost_microcents) filter (where actor = p_actor), 0)::bigint,
    coalesce(sum(cost_microcents), 0)::bigint
  from public.assistant_usage
  where day = (now() at time zone 'utc')::date;
$$;
revoke all on function public.assistant_spend(text) from public, anon, authenticated;
grant execute on function public.assistant_spend(text) to service_role;

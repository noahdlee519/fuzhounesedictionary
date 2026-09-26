-- ===========================================================================
--  email_signin.sql — accounts made by email sign-in (26 Sep 2026)
--
--  Run once in the Supabase SQL editor. Idempotent: safe to run again.
--  The dashboard settings that go with it are in email_signin.md.
--
--  A new account has taken its display name from the Google sign-in, and
--  failing that from the part of the email address before the @. With
--  Google that fallback never came up. With email sign-in it is every new
--  account, and it would put "noahdlee519" on the person's public profile
--  and beside every word and recording they contribute — most of their
--  email address, on a site whose privacy policy says the address is never
--  shown. So an account with no name from its sign-in now starts with none:
--  its contributions read "A contributor" until the person sets a name on
--  the account page, which asks them to.
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name',
                          new.raw_user_meta_data->>'name', '')), ''),
    nullif(coalesce(new.raw_user_meta_data->>'avatar_url',
                    new.raw_user_meta_data->>'picture'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Anyone who already signed up by email before this ran (their name is
-- exactly the start of their address, and they have no name from Google):
-- clear the name, so it is not shown.
update public.profiles p
   set display_name = null
  from auth.users u
 where u.id = p.id
   and p.display_name = split_part(u.email, '@', 1)
   and coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '') = '';

-- Confirm: accounts with no display name yet.
select count(*) as without_a_name from public.profiles where display_name is null;

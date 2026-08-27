# Fuzhounese Dictionary (福州話)

A community dictionary for **Fuzhounese** (Foochow / Eastern Min), built to the
project PRD. Visitors search words by characters, romanization, English, or
Chinese; signed-in contributors add words (with multiple senses and audio); and
every submission waits in an **editor moderation queue** before going live.

**Stack:** Next.js (App Router, TypeScript) · Supabase (Postgres + Auth + Storage) · Tailwind · deploys on Vercel. All free-tier.

---

## What it does (mapped to the PRD)

- **Search & browse** approved words; search ignores tone marks and case (`sioh` → `siŏh`).
- **Entries** carry characters, free-form romanization, IPA, audio, notes, an optional variety tag, and **one or more senses** (each with an English definition, optional Chinese gloss, example + translation).
- **Sign in with Google** to contribute (Supabase Auth).
- **Submit** a word with audio (upload ≤5 MB or paste a URL) and any number of senses → saved as `pending`.
- **My submissions** shows each contribution's status (pending / approved / rejected + editor note).
- **Moderation queue** (editors only): approve, reject with a note, or edit any entry.
- **Bulk import** your own list straight to approved via CSV.
- Content is licensed **CC BY-SA 4.0** (shown in the footer).

---

## Setup (~20 minutes)

### 1. Create a Supabase project
<https://supabase.com> → new project. Wait for it to provision.

### 2. Run the SQL (in order)
Supabase dashboard → **SQL Editor** → New query. Paste and run each file:
1. [`supabase/schema.sql`](supabase/schema.sql) — tables, RLS, search, submit function.
2. [`supabase/storage.sql`](supabase/storage.sql) — the `audio` storage bucket + policies.
3. [`supabase/seed.sql`](supabase/seed.sql) — ~25 starter words (optional).

> ⚠️ Seed words are a **starter set to verify**, not authoritative — review them.

### 3. Turn on Google sign-in
Supabase dashboard → **Authentication → Providers → Google** → enable, and paste a
Google OAuth **Client ID / Secret** (create them at
<https://console.cloud.google.com> → *APIs & Services → Credentials → OAuth client
ID → Web application*).

In the Google client's **Authorized redirect URIs**, add:
```
https://YOUR-PROJECT-ref.supabase.co/auth/v1/callback
```
And in Supabase → **Authentication → URL Configuration**, set the **Site URL** to
your app URL (`http://localhost:3000` for local dev; your Vercel URL in prod) and
add both to **Redirect URLs**.

### 4. Configure the app
```bash
cp .env.local.example .env.local
```
Fill in from Supabase → **Project Settings → API**:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000`).

### 5. Run it
```bash
npm install
npm run dev
```
Open <http://localhost:3000>.

### 6. Make yourself an editor
Sign in once with Google (this creates your profile). Then in Supabase → **SQL Editor**:
```sql
update public.profiles set is_editor = true where id =
  (select id from auth.users where email = 'YOUR-EMAIL@gmail.com');
```
Now the **Queue** link appears and you can approve submissions.

---

## Bulk-importing your own words

Put your list in a CSV (template: [`scripts/words.example.csv`](scripts/words.example.csv)):
```
group,hanzi,romanization,ipa,audio_url,variety,notes,part_of_speech,definition_en,gloss_zh,example,example_gloss
```
One row per meaning. To give one word several meanings, put the same value in the
`group` column on each of its rows. Then:
```bash
npm run import -- path/to/your-words.csv
```
Imported rows go straight to **approved**.

---

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. <https://vercel.com> → **Import** the repo.
3. Add the four env vars from `.env.local` (set `NEXT_PUBLIC_SITE_URL` to your Vercel URL).
4. Deploy, then add the Vercel URL to Supabase → Auth → URL Configuration (Site URL + Redirect URLs).

---

## How security works

- **Row Level Security** everywhere. The public role reads only `approved` entries; it can never see pending/rejected ones.
- **Contributors** may insert only their own `pending` entries (enforced by the `submit_entry` function running under RLS). They can't self-promote to editor — the `is_editor` column is revoked from client roles.
- **Editors** (`profiles.is_editor = true`) approve/reject/edit. Those writes run through server actions using the service-role key, which never reaches the browser.
- **Audio** uploads go to a per-user folder in the `audio` bucket; files are public-read.

---

## Project structure

```
supabase/  schema.sql · storage.sql · seed.sql
scripts/   import.ts (CSV bulk import) · words.example.csv
src/
  app/
    page.tsx              home + search
    browse/               browse all approved
    entry/[id]/           full entry (senses, audio, credit)
    submit/               sign-in-gated add-word form (client) + page
    account/              "my submissions"
    admin/                moderation queue + actions
    admin/edit/[id]/      editor edit form
    auth/callback         OAuth code exchange
    auth/signout
  components/  Header · SearchBar · EntryCard · SignInButton
  lib/         supabase/{client,server,admin} · auth · types · constants
  middleware.ts           refreshes the auth session
```

---

## Known follow-ups (from the PRD's open questions)

- **Which variety is the reference?** (Q-1) — an optional `variety` field exists; a decision on canonical form is still open.
- **Duplicate handling** (Q-2), **spam controls beyond sign-in** (Q-5), **multi-editor roles** (Q-4) — not yet built.
- A public **corrections/edit-suggestion** flow is intentionally a non-goal for v1 (editors edit directly).

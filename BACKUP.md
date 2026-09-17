# Backing up the dictionary

Everything on the site that cannot be regenerated is in two places: the
database (the words, meanings, who contributed what) and the storage
buckets (every recording, every avatar). The code and the schema are in this
repository, so they are already backed up by GitHub. The data is not backed
up by anything until you run this.

Supabase's Free plan takes no backups. The recordings are the part that
matters: a word said by a grandmother cannot be asked for again.

## Take a backup

From the repo folder, in Terminal:

```
npm run backup
```

That writes a dated folder under `~/Backups/fuzhounese/`, for example
`~/Backups/fuzhounese/2026-09-16T20-41-05Z/`, containing:

```
manifest.json          row counts, file counts, a checksum for every file
tables/entries.json    one JSON file per table
tables/recordings.json
tables/…
files/audio/<uid>/…    every recording, at the same path it has in the bucket
files/avatars/…
```

It prints what it saved as it goes, and ends with a line like
`Done. 58 recording rows, 58 audio files.` If the two numbers differ it says
why. It reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
from `.env.local`, the same as the importer, and never prints the key.

To put it somewhere else — an external drive, say:

```
npm run backup -- --to /Volumes/MyDrive/fuzhounese-backups
```

## Check a backup

```
npm run backup -- --verify ~/Backups/fuzhounese/2026-09-16T20-41-05Z
```

Recomputes every checksum against the manifest. `all 68 files match the
manifest` is the answer you want. A backup that fails this is not one you
should restore from, and the restore command refuses to.

## Keep a copy somewhere that is not this Mac

A backup on the same laptop as the only person who can run it is one spilled
coffee from being no backup. `~/Backups` is not in iCloud Drive by default.
Do one of:

- put the backup folder inside `~/Library/Mobile Documents/com~apple~CloudDocs/`
  (iCloud Drive) with `--to`, or
- copy the dated folder to an external drive, or
- any of Backblaze, Dropbox, Google Drive.

Two copies in two places is the whole point.

## Do it on a schedule

Weekly is right for a site where recordings arrive a few at a time. On the
Mac, `launchd` does this without you remembering. Save the following as
`~/Library/LaunchAgents/org.fuzhounese.backup.plist`, with your username in
place of `noahlee` if it differs:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>            <string>org.fuzhounese.backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd ~/Desktop/dictionary/fuzhounese-dictionary && npm run backup</string>
  </array>
  <!-- every Sunday at 09:00 local time -->
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key> <integer>0</integer>
    <key>Hour</key>    <integer>9</integer>
    <key>Minute</key>  <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>  <string>/Users/noahlee/Backups/fuzhounese/backup.log</string>
  <key>StandardErrorPath</key><string>/Users/noahlee/Backups/fuzhounese/backup.log</string>
</dict>
</plist>
```

Then, once:

```
mkdir -p ~/Backups/fuzhounese
launchctl load ~/Library/LaunchAgents/org.fuzhounese.backup.plist
```

If the Mac is asleep at nine on Sunday it runs when it next wakes. Check
`~/Backups/fuzhounese/backup.log` now and then; the last line of each run is
the `Done.` summary. To run it by hand at any time, `npm run backup` still
works.

Old backups are never deleted automatically. Each is a few MB plus the audio,
so a year of weekly ones is small, but clear out the oldest when you like.

## Restore

If the Supabase project is lost, on a fresh project:

1. Run the SQL files in `supabase/` in the order the comments at the top of
   each give (`schema.sql` first, then `storage.sql`, `word_requests.sql`,
   `contributor_origin.sql`, `abuse_limits.sql`, `recordings.sql`, and the
   rest). This recreates the empty tables and buckets.
2. Put the new project's URL and service-role key in `.env.local`.
3. `npm run backup -- --restore ~/Backups/fuzhounese/<the folder>`

It writes tables in dependency order, upserting on primary key — so running
it twice is safe — then uploads every file to its original path. It never
deletes anything, so a restore on top of a live project adds what is
missing and overwrites what has changed, and leaves the rest.

Rows carry their original ids, so recordings still point at their entries
and entries at their contributors. Contributors' `profiles` rows come back,
but their **logins** do not — Supabase Auth users are not in the backup, and
a restored profile is orphaned until that person signs in with Google again
and their new auth id is matched to it. That is a manual step for the day it
is ever needed, and for three contributors it is a short one.

## Try the restore once

A backup that has never been restored is a hope, not a backup. After the
first backup, make a throwaway Supabase project, run the SQL, restore into
it, open the dictionary against it, and delete the project. Half an hour,
once. Then you know.

## What this is and is not

It is every row and every file, checksummed, in a form you can read with any
text editor. It is not a `pg_dump`: sequences, auth users and the exact
storage metadata are not captured, and the schema is assumed to come from
`supabase/*.sql`. If you ever move to a paid plan, turn on Supabase's own
daily backups too, and keep running this — theirs keeps seven days; yours
keeps as many as you keep.

This was exercised end to end against a stand-in for Supabase: 2,350 entries
across three pages of results, 58 recordings, one avatar, two tables absent
on purpose; backed up, verified, a byte flipped and caught, restored into an
empty instance, restored again with no duplicates, and every table and file
compared identical to the original. The first run against the real project
is yours.

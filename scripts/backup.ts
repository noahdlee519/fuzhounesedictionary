/**
 * Back up everything in the dictionary that cannot be regenerated.
 *
 *   npm run backup                       # → ~/Backups/fuzhounese/2026-09-16T20-41-05Z/
 *   npm run backup -- --to /Volumes/USB  # somewhere else
 *   npm run backup -- --restore ~/Backups/fuzhounese/2026-09-16T20-41-05Z
 *
 * WHAT IT SAVES
 *   Every row of every table, as one JSON file per table, and every file in
 *   the audio and avatars buckets, under their own paths. Plus a manifest
 *   with row counts, file counts and a checksum per file, so a backup can be
 *   checked without opening it. The schema is not saved: it lives in
 *   supabase/*.sql in this repository, which is its backup.
 *
 * WHY THIS AND NOT pg_dump
 *   pg_dump needs Postgres client tools installed, and needs the database
 *   password. This needs nothing that is not already here — it reads the
 *   same .env.local the importer reads, with the same service-role key, and
 *   runs with the same `tsx`. The recordings are the irreplaceable part, and
 *   they are files, which pg_dump would not fetch anyway.
 *
 * WHAT IT NEEDS
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 *   The key is read into memory and used for the requests; it is never
 *   printed, and it is not written into the backup.
 *
 * RESTORE
 *   --restore <dir> writes a backup back: tables in dependency order, upsert
 *   on primary key so re-running is safe, then every file uploaded to the
 *   same path. Run the SQL files first on an empty project so the tables
 *   exist. It does not delete anything that is in the database and not in
 *   the backup.
 *
 * A backup that has never been restored is a hope, not a backup. After the
 * first one, try --restore against a throwaway Supabase project once.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { dirname, join, relative } from "path";

/* Tables, in the order a restore has to write them: nothing before the
   table it points at. Each with its primary key, for the upsert. */
const TABLES: { name: string; key: string }[] = [
  { name: "profiles", key: "id" },
  { name: "entries", key: "id" },
  { name: "senses", key: "id" },
  { name: "recordings", key: "id" },
  { name: "word_requests", key: "id" },
  { name: "word_request_votes", key: "request_id,user_id" },
  { name: "suggestions", key: "id" },
  { name: "recording_votes", key: "recording_id,user_id" },
  { name: "assistant_usage", key: "id" },
];
const BUCKETS = ["audio", "avatars"];
const PAGE = 1000; // PostgREST returns at most this many rows per request

function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local: the variables may be in the environment already */
  }
}

function client(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    console.error("Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local).");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const sha256 = (buf: Buffer | string) => createHash("sha256").update(buf).digest("hex");
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").replace(/-\d{3}Z$/, "Z");

/* ------------------------------------------------------------------ backup */

async function dumpTable(db: SupabaseClient, name: string): Promise<any[] | null> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(name).select("*").range(from, from + PAGE - 1);
    if (error) {
      // A table that a migration has not created yet is not an error in the
      // backup: there is nothing there to lose. Anything else is.
      if (/does not exist|schema cache|PGRST205/i.test(error.message)) {
        console.log(`  ${name}: table not present, skipped`);
        return null;
      }
      throw new Error(`${name}: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** Every object in a bucket, walking folders, since list() is one level deep. */
async function listBucket(db: SupabaseClient, bucket: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // A folder comes back with no id; a file has one.
      if (item.id === null || item.id === undefined) out.push(...(await listBucket(db, bucket, path)));
      else out.push(path);
    }
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function backup(root: string) {
  const db = client();
  const dir = join(root, stamp());
  mkdirSync(join(dir, "tables"), { recursive: true });
  const manifest: any = { taken: new Date().toISOString(), tables: {}, files: {}, sha256: {} };

  console.log(`Backing up to ${dir}`);
  for (const t of TABLES) {
    const rows = await dumpTable(db, t.name);
    if (rows === null) continue;
    const body = JSON.stringify(rows, null, 1);
    const file = join("tables", `${t.name}.json`);
    writeFileSync(join(dir, file), body);
    manifest.tables[t.name] = rows.length;
    manifest.sha256[file] = sha256(body);
    console.log(`  ${t.name}: ${rows.length} rows`);
  }

  for (const bucket of BUCKETS) {
    const paths = await listBucket(db, bucket);
    let bytes = 0;
    for (const p of paths) {
      const { data, error } = await db.storage.from(bucket).download(p);
      if (error || !data) throw new Error(`${bucket}/${p}: ${error?.message ?? "no data"}`);
      const buf = Buffer.from(await data.arrayBuffer());
      const file = join("files", bucket, p);
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      writeFileSync(join(dir, file), buf);
      manifest.sha256[file] = sha256(buf);
      bytes += buf.length;
    }
    manifest.files[bucket] = { count: paths.length, bytes };
    console.log(`  ${bucket}: ${paths.length} files, ${(bytes / 1_048_576).toFixed(1)} MB`);
  }

  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const recs = manifest.tables.recordings ?? 0;
  const audio = manifest.files.audio?.count ?? 0;
  console.log(`\nDone. ${recs} recording rows, ${audio} audio files.`);
  if (recs > audio) {
    console.log(`Note: more recording rows than audio files — ${recs - audio} rows point at files not in the bucket (imported from elsewhere, or missing).`);
  }
}

/* ----------------------------------------------------------------- verify */

function verify(dir: string): boolean {
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  let bad = 0;
  for (const [file, want] of Object.entries<string>(manifest.sha256)) {
    const p = join(dir, file);
    if (!existsSync(p)) { console.log(`  missing: ${file}`); bad++; continue; }
    if (sha256(readFileSync(p)) !== want) { console.log(`  changed: ${file}`); bad++; }
  }
  console.log(bad ? `${bad} problem(s)` : `all ${Object.keys(manifest.sha256).length} files match the manifest`);
  return bad === 0;
}

/* ---------------------------------------------------------------- restore */

async function restore(dir: string) {
  if (!verify(dir)) {
    console.error("Backup does not match its manifest; not restoring from it.");
    process.exit(1);
  }
  const db = client();
  console.log(`Restoring from ${dir}`);
  for (const t of TABLES) {
    const p = join(dir, "tables", `${t.name}.json`);
    if (!existsSync(p)) continue;
    const rows: any[] = JSON.parse(readFileSync(p, "utf8"));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from(t.name).upsert(rows.slice(i, i + 500), { onConflict: t.key });
      if (error) throw new Error(`${t.name}: ${error.message}`);
    }
    console.log(`  ${t.name}: ${rows.length} rows`);
  }
  for (const bucket of BUCKETS) {
    const base = join(dir, "files", bucket);
    if (!existsSync(base)) continue;
    const files = walk(base);
    for (const f of files) {
      const path = relative(base, f).split("\\").join("/");
      const { error } = await db.storage.from(bucket).upload(path, readFileSync(f), { upsert: true });
      if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
    }
    console.log(`  ${bucket}: ${files.length} files`);
  }
  console.log("\nRestored.");
}

function walk(d: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------- main */

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const arg = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };

  if (args.includes("--restore")) {
    const dir = arg("--restore");
    if (!dir) { console.error("--restore needs the backup folder"); process.exit(1); }
    await restore(dir);
    return;
  }
  if (args.includes("--verify")) {
    const dir = arg("--verify");
    if (!dir) { console.error("--verify needs the backup folder"); process.exit(1); }
    process.exit(verify(dir) ? 0 : 1);
  }
  const root = arg("--to") ?? join(homedir(), "Backups", "fuzhounese");
  await backup(root);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

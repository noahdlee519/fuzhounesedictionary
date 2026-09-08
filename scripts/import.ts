/**
 * Bulk-import words from a CSV.
 *
 * Flags (after the file):
 *   --status pending|approved   where the words land (default: approved).
 *                               "pending" puts them in the moderation queue.
 *   --limit N                   import only the first N entries (a trial run)
 *   --dry                       parse and report, insert nothing
 *
 * Entries whose characters already exist in the dictionary (any status but
 * rejected) are skipped and listed, so re-running a file, or importing a
 * source that overlaps what speakers have added, never makes duplicates.
 *
 * CSV columns (header row required; any subset, but definition_en plus one of
 * hanzi/romanization is needed):
 *
 *   group,hanzi,romanization,ipa,audio_url,variety,notes,
 *   part_of_speech,definition_en,gloss_zh,example,example_gloss
 *
 * • One row = one meaning. To give a word MORE THAN ONE meaning, put the same
 *   value in the `group` column on each of its rows; entry-level fields
 *   (hanzi, romanization, ipa, …) are taken from the first row of the group.
 * • Rows with no `group` each become their own single-sense entry.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local).
 * Run:  npm run import -- path/to/words.csv
 */
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const clean = (v?: string) => {
  const s = (v ?? "").trim();
  return s.length ? s : null;
};

function flag(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] ?? "" : null;
}

async function main() {
  loadEnv();
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.error("Usage: npm run import -- path/to/words.csv [--status pending|approved] [--limit N] [--dry]");
    process.exit(1);
  }
  const status = flag("status") ?? "approved";
  if (status !== "pending" && status !== "approved") {
    console.error("--status must be pending or approved");
    process.exit(1);
  }
  const limit = flag("limit") ? parseInt(flag("limit")!, 10) : Infinity;
  const dry = process.argv.includes("--dry");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const rows: Record<string, string>[] = parse(readFileSync(file, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Group rows into entries.
  const groups = new Map<string, Record<string, string>[]>();
  let auto = 0;
  for (const r of rows) {
    const g = clean(r.group) ?? `__auto_${auto++}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(r);
  }

  // What the dictionary already holds, by characters, so an import never
  // duplicates a word a speaker has added (or an earlier run of this file).
  const existing = new Set<string>();
  {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("entries")
        .select("hanzi")
        .neq("status", "rejected")
        .not("hanzi", "is", null)
        .range(from, from + 999);
      if (error) {
        console.error("Could not read existing entries:", error.message);
        process.exit(1);
      }
      for (const e of data ?? []) if (e.hanzi) existing.add(e.hanzi.trim());
      if (!data || data.length < 1000) break;
      from += 1000;
    }
  }

  let entriesDone = 0;
  let sensesDone = 0;
  let skipped = 0;
  let duplicates = 0;
  const dupList: string[] = [];

  for (const [, groupRows] of groups) {
    if (entriesDone >= limit) break;
    const head = groupRows[0];
    const headword = clean(head.romanization) ?? clean(head.hanzi);
    const hanzi = clean(head.hanzi);
    if (hanzi && existing.has(hanzi)) {
      duplicates++;
      if (dupList.length < 40) dupList.push(hanzi);
      continue;
    }
    const senses = groupRows
      .map((r, i) => {
        const def = clean(r.definition_en);
        if (!def) return null;
        return {
          part_of_speech: clean(r.part_of_speech),
          definition_en: def,
          gloss_zh: clean(r.gloss_zh),
          example: clean(r.example),
          example_gloss: clean(r.example_gloss),
          sort: i,
        };
      })
      .filter(Boolean) as any[];

    if (!headword || senses.length === 0) {
      skipped++;
      continue;
    }

    if (dry) {
      entriesDone++;
      sensesDone += senses.length;
      if (hanzi) existing.add(hanzi);
      continue;
    }

    const { data: entry, error: eErr } = await supabase
      .from("entries")
      .insert({
        headword,
        hanzi: clean(head.hanzi),
        romanization: clean(head.romanization),
        ipa: clean(head.ipa),
        audio_url: clean(head.audio_url),
        variety: clean(head.variety),
        notes: clean(head.notes),
        status,
        // An approved import is reviewed by definition; a pending one waits.
        reviewed_at: status === "approved" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (eErr) {
      console.error("Entry insert error:", eErr.message);
      process.exit(1);
    }

    const { error: sErr } = await supabase
      .from("senses")
      .insert(senses.map((s) => ({ ...s, entry_id: entry!.id })));
    if (sErr) {
      console.error("Sense insert error:", sErr.message);
      process.exit(1);
    }

    if (hanzi) existing.add(hanzi);
    entriesDone++;
    sensesDone += senses.length;
    if (entriesDone % 50 === 0) console.log(`  …${entriesDone} entries`);
  }

  console.log(
    `${dry ? "Dry run. Would import" : "Done. Imported"} ${entriesDone} entries / ${sensesDone} senses as ${status}. ` +
      `Skipped ${skipped} incomplete group(s) and ${duplicates} already in the dictionary` +
      (dupList.length ? ` (${dupList.join(" ")}${duplicates > dupList.length ? " …" : ""})` : "") +
      "."
  );
}

main();

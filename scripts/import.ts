/**
 * Bulk-import your own words from a CSV, straight to "approved".
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

async function main() {
  loadEnv();
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run import -- path/to/words.csv");
    process.exit(1);
  }
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

  let entriesDone = 0;
  let sensesDone = 0;
  let skipped = 0;

  for (const [, groupRows] of groups) {
    const head = groupRows[0];
    const headword = clean(head.romanization) ?? clean(head.hanzi);
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
        status: "approved",
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

    entriesDone++;
    sensesDone += senses.length;
    if (entriesDone % 50 === 0) console.log(`  …${entriesDone} entries`);
  }

  console.log(`Done. Imported ${entriesDone} entries / ${sensesDone} senses. Skipped ${skipped} incomplete group(s).`);
}

main();

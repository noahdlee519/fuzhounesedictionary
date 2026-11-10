import { NextResponse, type NextRequest } from "next/server";
import { originArea } from "@/lib/origins";
import { bucToYngping } from "@/lib/romanization";
import { isExplicit } from "@/lib/content-filter";
import { SITE_URL } from "@/lib/site";
import { anonDb, csvFile, FEED_HEADERS, LICENSE, LICENSE_URL } from "@/lib/export";

/* The words feed: every published word with all its meanings — the
   companion to the recordings feed (../recordings), added for SeeDict
   (米时典) in Nov 2026 and open to anyone. Each word lists the ids of its
   recordings in that feed, so the two join on recording id.

   Like the recordings feed: the whole list every time, only what the site
   shows anyone (anon key, published words), cached an hour at the edge.
   Explicit meanings are included — a dictionary records what people say —
   and marked, the same test the site's "hide explicit words" filter uses. */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PAGE = 1000;

type Row = {
  id: string;
  headword: string;
  hanzi: string | null;
  romanization: string | null;
  ipa: string | null;
  notes: string | null;
  origin_area: string | null;
  origin_locality: string | null;
  created_at: string;
  updated_at?: string | null;
  contributor: { id: string; display_name: string | null } | null;
  senses: {
    id: string;
    part_of_speech: string | null;
    definition_en: string | null;
    gloss_zh: string | null;
    example: string | null;
    example_gloss: string | null;
    sort: number | null;
  }[] | null;
};

export interface FeedWord {
  id: string;
  url: string;
  hanzi: string | null;
  /** As the dictionary writes it (Bàng-uâ-cê for almost every word). */
  romanization: string | null;
  /** The same converted to Yngping 榕拼; null where it cannot be. */
  yngping: string | null;
  ipa: string | null;
  meanings: {
    part_of_speech: string | null;
    english: string | null;
    mandarin: string | null;
    example: { text: string | null; translation: string | null } | null;
    /** Vulgar or sexual; the site hides these from lists by default. */
    explicit: boolean;
  }[];
  /** Where the word's Fuzhounese is from, when the person who added it said. */
  origin: { code: string; label: string; locality: string | null } | null;
  /** The account that added the word; null for words imported from a source. */
  added_by: { name: string; url: string } | null;
  /** The published source a word was imported from (credit it, too). */
  source: { name: string; url: string } | null;
  notes: string | null;
  /** Ids of this word's recordings in the recordings feed. */
  recording_ids: string[];
  created_at: string;
  updated_at: string;
}

/* "Imported from Wiktionary (CC BY-SA 4.0): https://en.wiktionary.org/wiki/…#Chinese." */
function sourceOf(notes: string | null): FeedWord["source"] {
  const m = notes?.match(/Imported from Wiktionary[^:]*:\s*(https:\/\/\S+?)\.?(?:\s|$)/);
  return m ? { name: "Wiktionary", url: m[1] } : null;
}

async function load(): Promise<FeedWord[]> {
  const db = anonDb();
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("entries")
      .select(
        "id, headword, hanzi, romanization, ipa, notes, origin_area, origin_locality, created_at, updated_at," +
          " contributor:profiles!entries_contributor_id_fkey(id, display_name)," +
          " senses(id, part_of_speech, definition_en, gloss_zh, example, example_gloss, sort)"
      )
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < PAGE) break;
  }

  // The same takes the recordings feed lists: published and checked.
  const takes = new Map<string, string[]>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("recordings")
      .select("id, entry_id")
      .eq("status", "approved")
      .not("reviewed_at", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as { id: string; entry_id: string }[]) {
      const list = takes.get(r.entry_id) ?? [];
      list.push(r.id);
      takes.set(r.entry_id, list);
    }
    if (!data || data.length < PAGE) break;
  }

  return rows.map((e) => {
    const area = originArea(e.origin_area);
    const name = (e.contributor?.display_name ?? "").trim();
    return {
      id: e.id,
      url: `${SITE_URL}/entry/${e.id}`,
      hanzi: e.hanzi,
      romanization: e.romanization,
      yngping: e.romanization ? bucToYngping(e.romanization) : null,
      ipa: (e.ipa ?? "").trim() || null,
      meanings: [...(e.senses ?? [])]
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        .map((s) => ({
          part_of_speech: s.part_of_speech,
          english: s.definition_en,
          mandarin: (s.gloss_zh ?? "").trim() || null,
          example:
            (s.example ?? "").trim() || (s.example_gloss ?? "").trim()
              ? { text: (s.example ?? "").trim() || null, translation: (s.example_gloss ?? "").trim() || null }
              : null,
          explicit: isExplicit(s.definition_en),
        })),
      origin: area ? { code: area.code, label: `${area.label} ${area.hanzi}`, locality: (e.origin_locality ?? "").trim() || null } : null,
      added_by: e.contributor ? { name: name || "a contributor", url: `${SITE_URL}/contributor/${e.contributor.id}` } : null,
      source: sourceOf(e.notes),
      notes: (e.notes ?? "").trim() || null,
      recording_ids: takes.get(e.id) ?? [],
      created_at: e.created_at,
      updated_at: e.updated_at ?? e.created_at,
    };
  });
}

/* The spreadsheet has one row per meaning, the word's own columns repeated,
   so every meaning gets its own line to sort and filter on. */
const COLUMNS = [
  "word_id", "word_url", "hanzi", "romanization", "yngping", "ipa",
  "meaning_no", "part_of_speech", "meaning_en", "meaning_zh", "example", "example_translation", "explicit",
  "origin_code", "origin", "origin_locality", "added_by", "source_url", "notes", "recordings",
  "created_at", "updated_at",
];

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  let words: FeedWord[];
  try {
    words = await load();
  } catch (e: any) {
    console.error(`words feed: ${e?.message ?? e}`);
    return NextResponse.json(
      { error: "The feed is not available just now. Try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (format === "csv") {
    const rows = words.flatMap((w) => {
      const meanings = w.meanings.length ? w.meanings : [null];
      return meanings.map((m, i) => [
        w.id, w.url, w.hanzi, w.romanization, w.yngping, w.ipa,
        m ? i + 1 : null, m?.part_of_speech ?? null, m?.english ?? null, m?.mandarin ?? null,
        m?.example?.text ?? null, m?.example?.translation ?? null, m ? m.explicit : null,
        w.origin?.code ?? null, w.origin?.label ?? null, w.origin?.locality ?? null,
        w.added_by?.name ?? null, w.source?.url ?? null, w.notes, w.recording_ids.length,
        w.created_at, w.updated_at,
      ]);
    });
    return new NextResponse(csvFile(COLUMNS, rows), {
      headers: {
        ...FEED_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fuzhounese-words.csv"',
      },
    });
  }

  return NextResponse.json(
    {
      source: SITE_URL,
      documentation: `${SITE_URL}/data`,
      license: LICENSE,
      license_url: LICENSE_URL,
      terms:
        "The dictionary is CC BY-SA 4.0. Credit fuzhounese.org, and the source named on a word where it has one, and share adaptations under the same licence. This is the complete current list.",
      generated_at: new Date().toISOString(),
      count: words.length,
      words,
    },
    { headers: FEED_HEADERS }
  );
}

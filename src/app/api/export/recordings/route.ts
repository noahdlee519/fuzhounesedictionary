import { NextResponse, type NextRequest } from "next/server";
import { formatOrigin, originArea } from "@/lib/origins";
import { bucToYngping } from "@/lib/romanization";
import { SITE_URL } from "@/lib/site";
import { anonDb, csvFile, FEED_HEADERS, LICENSE, LICENSE_URL } from "@/lib/export";

/* The recordings feed: every published recording, with what a partner
   project needs to use it — the word, the audio file, who said it and where
   their Fuzhounese is from, and the licence. Set up for SeeDict (米时典),
   Nov 2026; open to anyone, like the recordings themselves. How to use it is
   on /data.

   Always the whole list, never "what changed since": a partner compares it
   with their copy, downloads what is new, and removes what is gone. A take
   an editor deletes, or a contributor asks to have removed, then drops out
   of every copy at the next sync without a record of deletions having to be
   kept anywhere.

   Only what the site already shows anyone: the public (anon) key, no
   cookies, so the database's own row rules decide what is visible, and only
   takes an editor has listened to (reviewed_at set) — one that went live a
   minute ago and has not been checked yet waits for the next sync.

   Cached at Vercel's edge for an hour, so a feed polled by many is still at
   most one database read an hour per format. */

export const dynamic = "force-dynamic";
// Never Next's Data Cache: without this the database read itself was cached
// for a year (seen in .next/cache/fetch-cache), so the feed would have kept
// serving its first snapshot. Freshness is the edge cache's job (an hour,
// Cache-Control below).
export const fetchCache = "force-no-store";

const PAGE = 1000;
/* A word said on its own takes about 2 seconds (median 1.8 over 457 takes,
   Nov 2026). Every take over 8 was the word followed by a sentence. */
const LONG_TAKE = 8;

type Row = {
  id: string;
  kind: string;
  audio_url: string;
  seconds: number | null;
  note: string | null;
  speaker_name?: string | null;
  origin_area: string | null;
  origin_locality: string | null;
  created_at: string;
  reviewed_at: string | null;
  contributor: { id: string; display_name: string | null } | null;
  entry: {
    id: string;
    headword: string;
    hanzi: string | null;
    romanization: string | null;
    status: string;
    senses: { definition_en: string | null; gloss_zh: string | null; sort: number | null }[] | null;
  } | null;
  sense: { id: string; definition_en: string | null; example: string | null; example_gloss: string | null } | null;
};

export interface FeedRecording {
  id: string;
  kind: "headword" | "example";
  audio_url: string;
  /** File type, from the file name (the site records webm/Opus). */
  format: string;
  seconds: number | null;
  word: {
    id: string;
    url: string;
    hanzi: string | null;
    /** As the dictionary writes it (Bàng-uâ-cê for almost every word). */
    romanization: string | null;
    /** The same converted to Yngping 榕拼; null where it cannot be. */
    yngping: string | null;
    /** The first English meaning. */
    meaning_en: string | null;
    /** The first Mandarin gloss, where there is one. */
    meaning_zh: string | null;
  };
  /** For an example-sentence recording: the sentence being read (text,
   *  Fuzhounese as written in the dictionary) and its English. Where the
   *  sentence itself was never written down, the English is the speaker's
   *  own note on the take, and translation_from says so. */
  sentence: {
    text: string | null;
    translation: string | null;
    translation_from: "dictionary" | "speaker_note" | null;
    meaning_en: string | null;
  } | null;
  /** True when the audio comes with a written form of exactly what is
   *  said — what text-to-speech and alignment work needs. See flags. */
  tts_ready: boolean;
  /** Why tts_ready is false, if it is:
   *  "sentence_not_transcribed" — an example sentence with no written text;
   *  "no_romanization" — the word has no pronunciation written down;
   *  "romanization_not_standard" — written in another system (tone numbers,
   *  say) that does not convert to Yngping.
   *  "longer_than_word" — a word recording over LONG_TAKE seconds, which
   *  here means the speaker said the word and then used it in a sentence
   *  (ten takes, Nov 2026; a word alone is under 2 seconds as a rule).
   */
  flags: string[];
  /** The speaker's own line about the take, if they wrote one. */
  note: string | null;
  /** Who is speaking, when it is not the account holder (a grandparent, say). */
  speaker: string | null;
  /** The account that recorded it, as credited on the site. */
  recorded_by: { name: string; url: string | null };
  /** Where the speaker's Fuzhounese is from, as the site labels it. */
  origin: { code: string; label: string; locality: string | null } | null;
  /** Credit line to show with the audio (the licence requires one). */
  attribution: string;
  published_at: string;
  checked_at: string;
}

async function load(): Promise<FeedRecording[]> {
  const db = anonDb();
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("recordings")
      .select(
        "id, kind, audio_url, seconds, note, speaker_name, origin_area, origin_locality, created_at, reviewed_at," +
          " contributor:profiles!recordings_contributor_id_fkey(id, display_name)," +
          " entry:entries(id, headword, hanzi, romanization, status, senses(definition_en, gloss_zh, sort))," +
          " sense:senses(id, definition_en, example, example_gloss)"
      )
      .eq("status", "approved")
      .not("reviewed_at", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < PAGE) break;
  }

  return rows
    .filter((r) => r.entry && r.entry.status === "approved")
    .map((r) => {
      const e = r.entry!;
      const first = [...(e.senses ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      const area = originArea(r.origin_area);
      const who = (r.contributor?.display_name ?? "").trim() || "a contributor";
      const speaker = (r.speaker_name ?? "").trim() || null;
      const place = formatOrigin(r.origin_area, r.origin_locality);
      const word = e.hanzi || e.romanization || e.headword;
      const yngping = e.romanization ? bucToYngping(e.romanization) : null;
      const note = (r.note ?? "").trim() || null;
      const example = r.kind === "example";
      const sentenceText = example ? (r.sense?.example ?? "").trim() || null : null;
      /* What stands between this take and use as text-to-speech data: the
         words actually said must be written down, in a system that reads. */
      const flags: string[] = [];
      if (example && !sentenceText) flags.push("sentence_not_transcribed");
      if (!example && !(e.romanization ?? "").trim()) flags.push("no_romanization");
      else if (!example && !yngping) flags.push("romanization_not_standard");
      if (!example && r.seconds != null && Number(r.seconds) > LONG_TAKE) flags.push("longer_than_word");
      return {
        id: r.id,
        kind: r.kind === "example" ? "example" : "headword",
        audio_url: r.audio_url,
        format: (r.audio_url.split("?")[0].split(".").pop() ?? "").toLowerCase(),
        seconds: r.seconds == null ? null : Number(r.seconds),
        word: {
          id: e.id,
          url: `${SITE_URL}/entry/${e.id}`,
          hanzi: e.hanzi,
          romanization: e.romanization,
          yngping,
          meaning_en: first.find((s) => s.definition_en)?.definition_en ?? null,
          meaning_zh: first.find((s) => s.gloss_zh)?.gloss_zh ?? null,
        },
        sentence: example
          ? {
              text: sentenceText,
              translation: (r.sense?.example_gloss ?? "").trim() || (sentenceText ? null : note),
              translation_from: (r.sense?.example_gloss ?? "").trim()
                ? "dictionary"
                : !sentenceText && note
                  ? "speaker_note"
                  : null,
              meaning_en: r.sense?.definition_en ?? null,
            }
          : null,
        tts_ready: flags.length === 0,
        flags,
        note,
        speaker,
        recorded_by: { name: who, url: r.contributor ? `${SITE_URL}/contributor/${r.contributor.id}` : null },
        origin: area ? { code: area.code, label: `${area.label} ${area.hanzi}`, locality: (r.origin_locality ?? "").trim() || null } : null,
        attribution: `${word}${speaker ? `, said by ${speaker}` : ""}, recorded by ${who}${place ? ` (${place})` : ""}. fuzhounese.org, ${LICENSE}.`,
        published_at: r.created_at,
        checked_at: r.reviewed_at!,
      };
    });
}

const COLUMNS: [string, (r: FeedRecording) => string | number | null][] = [
  ["id", (r) => r.id],
  ["kind", (r) => r.kind],
  ["audio_url", (r) => r.audio_url],
  ["format", (r) => r.format],
  ["seconds", (r) => r.seconds],
  ["word_id", (r) => r.word.id],
  ["word_url", (r) => r.word.url],
  ["hanzi", (r) => r.word.hanzi],
  ["romanization", (r) => r.word.romanization],
  ["yngping", (r) => r.word.yngping],
  ["meaning_en", (r) => r.word.meaning_en],
  ["meaning_zh", (r) => r.word.meaning_zh],
  ["sentence", (r) => r.sentence?.text ?? null],
  ["sentence_translation", (r) => r.sentence?.translation ?? null],
  ["sentence_translation_from", (r) => r.sentence?.translation_from ?? null],
  ["tts_ready", (r) => (r.tts_ready ? "yes" : "no")],
  ["flags", (r) => r.flags.join(" ")],
  ["note", (r) => r.note],
  ["speaker", (r) => r.speaker],
  ["recorded_by", (r) => r.recorded_by.name],
  ["recorded_by_url", (r) => r.recorded_by.url],
  ["origin_code", (r) => r.origin?.code ?? null],
  ["origin", (r) => r.origin?.label ?? null],
  ["origin_locality", (r) => r.origin?.locality ?? null],
  ["attribution", (r) => r.attribution],
  ["published_at", (r) => r.published_at],
  ["checked_at", (r) => r.checked_at],
];

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  let recordings: FeedRecording[];
  try {
    recordings = await load();
  } catch (e: any) {
    console.error(`recordings feed: ${e?.message ?? e}`);
    return NextResponse.json(
      { error: "The feed is not available just now. Try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const headers = FEED_HEADERS;

  if (format === "csv") {
    const body = csvFile(
      COLUMNS.map(([k]) => k),
      recordings.map((r) => COLUMNS.map(([, f]) => f(r)))
    );
    return new NextResponse(body, {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fuzhounese-recordings.csv"',
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
        "Each recording is CC BY-SA 4.0. Credit the speaker and fuzhounese.org (the attribution field is a ready-made line), and share adaptations under the same licence. This is the complete current list: remove any recording you hold that is no longer in it.",
      generated_at: new Date().toISOString(),
      count: recordings.length,
      recordings,
    },
    { headers }
  );
}

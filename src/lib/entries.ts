import type { CardProps } from "@/components/EntryCard";
import { originArea } from "@/lib/origins";

/** What the tooltip on an audio button says: who is speaking, who recorded
 *  it, and where their Fuzhounese is from. Null when nothing is known. */
export interface AudioCredit {
  title: string;
  detail: string | null;
}
export function audioCredit(by: string | null, speaker: string | null, origin: string | null): AudioCredit | null {
  const area = originArea(origin);
  const place = area ? `${area.label} ${area.hanzi}` : null;
  const sp = speaker?.trim();
  if (sp) return { title: `Said by ${sp}`, detail: [by ? `recorded by ${by}` : null, place].filter(Boolean).join(" · ") || null };
  if (by) return { title: `Recorded by ${by}`, detail: place };
  return place ? { title: "Recorded by a contributor", detail: place } : null;
}

/** Senses in display order (the `sort` column), without mutating the input. */
export function sortSenses<T extends { sort?: number | null }>(senses: T[] | null | undefined): T[] {
  return [...(senses ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

/** The first sense of an entry, by sort order. */
export function firstSense<T extends { sort?: number | null }>(senses: T[] | null | undefined): T | null {
  return sortSenses(senses)[0] ?? null;
}

/** supabase-js types a to-one embed (`contributor:profiles(...)`) as an array.
 *  Flatten it once at the query site rather than casting at every use. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Map an entries row (with its senses joined) onto an EntryCard.
 *  `extraRecordings` is the number of approved rows in the recordings table for
 *  this entry; the legacy audio_url column counts as one on top of that. */
export function toCard(e: any, extraRecordings = 0): CardProps {
  const s = firstSense<any>(e.senses);
  return {
    id: e.id,
    hanzi: e.hanzi,
    romanization: e.romanization,
    headword: e.headword,
    pos: s?.part_of_speech ?? null,
    gloss: s?.definition_en ?? null,
    senseNo: (s?.sort ?? 0) + 1,
    recordings: (e.audio_url ? 1 : 0) + extraRecordings,
  };
}

/** How many approved recordings each of these entries has.
 *
 *  Returns an empty map rather than throwing if the recordings table is not
 *  there yet — supabase/recordings.sql has to be run before it exists, and a
 *  word list should not break in the meantime. The cards then fall back to
 *  counting entries.audio_url alone. */
export async function recordingCounts(
  supabase: { from: (t: string) => any },
  ids: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!ids.length) return counts;

  const { data, error } = await supabase
    .from("recordings")
    .select("entry_id")
    .eq("status", "approved")
    .in("entry_id", ids);
  if (error) return counts;

  for (const r of (data ?? []) as { entry_id: string }[]) {
    counts.set(r.entry_id, (counts.get(r.entry_id) ?? 0) + 1);
  }
  return counts;
}

export interface RecordingSummary {
  /** Approved recordings in the recordings table. */
  count: number;
  /** The one to play from a card: the best-liked reading of the word
   *  itself (up minus down votes), the earliest when tied. */
  top: string | null;
  /** Who made that take, and who is speaking in it if someone else, for the
   *  tooltip on the card's audio button. */
  topBy?: string | null;
  topSpeaker?: string | null;
  topOrigin?: string | null;
}

/** For each entry, how many approved recordings it has and which one a card
 *  should play. Fetches the recordings, then summarises them
 *  (summarizeRecordings); both tolerate their table not existing yet. */
export async function recordingSummary(
  supabase: { from: (t: string) => any },
  ids: string[]
): Promise<Map<string, RecordingSummary>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from("recordings")
    // "*" so speaker_name comes through once recording_speaker.sql has run.
    .select("*")
    .eq("status", "approved")
    .in("entry_id", ids)
    .order("created_at", { ascending: true });
  if (error || !data?.length) return new Map();
  return summarizeRecordings(supabase, data as RecRow[]);
}

type RecRow = {
  id: string; entry_id: string; kind: string; audio_url: string; created_at: string; status?: string;
  contributor_id?: string | null; speaker_name?: string | null; origin_area?: string | null;
};

/** The summary from recordings already in hand (oldest first). The vote
 *  totals and the contributors' names are fetched together, in one round
 *  trip rather than two: the names are looked up for everyone who made one
 *  of these takes, before knowing which take will be chosen. */
export async function summarizeRecordings(
  supabase: { from: (t: string) => any },
  rows: RecRow[]
): Promise<Map<string, RecordingSummary>> {
  const out = new Map<string, RecordingSummary>();
  if (!rows.length) return out;
  const people = [...new Set(rows.map((r) => r.contributor_id).filter(Boolean))] as string[];
  const [{ data: totals }, { data: profs }] = await Promise.all([
    supabase.from("recording_vote_totals").select("recording_id, up, down").in("recording_id", rows.map((r) => r.id)),
    people.length
      ? supabase.from("profiles").select("id, display_name").in("id", people)
      : Promise.resolve({ data: [] }),
  ]);
  const score = new Map<string, number>();
  for (const t of (totals ?? []) as any[]) score.set(t.recording_id, Number(t.up) - Number(t.down));
  const names = new Map<string, string | null>();
  for (const p of (profs ?? []) as any[]) names.set(p.id, p.display_name ?? null);

  const byEntry = new Map<string, RecRow[]>();
  for (const r of rows) byEntry.set(r.entry_id, [...(byEntry.get(r.entry_id) ?? []), r]);
  for (const [entryId, recs] of byEntry) {
    // Readings of the word itself before example sentences; then the votes;
    // then age (the rows arrive oldest first, and sort is stable).
    const best = [...recs].sort(
      (a, b) =>
        Number(b.kind === "headword") - Number(a.kind === "headword") ||
        (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0)
    )[0];
    out.set(entryId, {
      count: recs.length,
      top: best?.audio_url ?? null,
      topBy: best?.contributor_id ? names.get(best.contributor_id) ?? null : null,
      topSpeaker: best?.speaker_name ?? null,
      topOrigin: best?.origin_area ?? null,
    });
  }
  return out;
}

/** What a list query can embed so toCards needs no lookups of its own: every
 *  meaning's count and the approved recordings, oldest first. Add it to the
 *  select and pass the query through withCardEmbeds. */
export const CARD_EMBEDS = "sense_total:senses(count), recordings(*)";
export function withCardEmbeds<Q extends { eq: (c: string, v: any) => Q; order: (c: string, o: any) => Q }>(q: Q): Q {
  return q.eq("recordings.status", "approved").order("created_at", { referencedTable: "recordings", ascending: true });
}

/** Rows with senses joined → cards with live recording counts and the
 *  recording each card plays, in two round trips for the whole page. */
export async function toCards(supabase: { from: (t: string) => any }, rows: any[]): Promise<CardProps[]> {
  const ids = rows.map((r) => r.id);
  // Rows that carry CARD_EMBEDS bring their recordings and meaning counts
  // with them; only the votes and names are left to fetch.
  const embedded = rows.length > 0 && rows.every((r) => Array.isArray(r.recordings) && Array.isArray(r.sense_total));
  const [summary, meanings] = embedded
    ? [
        await summarizeRecordings(supabase, rows.flatMap((r) => r.recordings as RecRow[]).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))),
        new Map<string, number>(rows.map((r) => [r.id, Number(r.sense_total?.[0]?.count ?? 0)])),
      ]
    : await Promise.all([recordingSummary(supabase, ids), senseCounts(supabase, ids)]);
  return rows.map((r) => {
    const s = summary.get(r.id);
    return {
      ...toCard(r, s?.count ?? 0),
      audio: s?.top ?? r.audio_url ?? null,
      audioCredit: s?.top ? audioCredit(s.topBy ?? null, s.topSpeaker ?? null, s.topOrigin ?? null) : null,
      senses: meanings.get(r.id),
    };
  });
}

/** How many meanings each entry has. The cards' own joined senses cannot
 *  say: a filter narrows them to the meanings that matched, and the English
 *  order brings one per row. An empty map if the query fails, and the cards
 *  then simply do not number their meaning. */
async function senseCounts(supabase: { from: (t: string) => any }, ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!ids.length) return out;
  const { data, error } = await supabase.from("senses").select("entry_id").in("entry_id", ids);
  if (error) return out;
  for (const r of (data ?? []) as { entry_id: string }[]) out.set(r.entry_id, (out.get(r.entry_id) ?? 0) + 1);
  return out;
}

/** "福州 · Hók-ciŭ" — the word as a human would name it in a page title. */
export function entryTitle(e: {
  hanzi?: string | null;
  romanization?: string | null;
  headword: string;
}): string {
  const roman = e.romanization || e.headword;
  return e.hanzi ? `${e.hanzi} · ${roman}` : roman;
}

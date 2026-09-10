import type { CardProps } from "@/components/EntryCard";

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
}

/** For each entry, how many approved recordings it has and which one a card
 *  should play. Two round trips (recordings, then their vote totals); both
 *  tolerate their table not existing yet. */
export async function recordingSummary(
  supabase: { from: (t: string) => any },
  ids: string[]
): Promise<Map<string, RecordingSummary>> {
  const out = new Map<string, RecordingSummary>();
  if (!ids.length) return out;

  const { data, error } = await supabase
    .from("recordings")
    .select("id, entry_id, kind, audio_url, created_at")
    .eq("status", "approved")
    .in("entry_id", ids)
    .order("created_at", { ascending: true });
  if (error || !data?.length) return out;
  const rows = data as { id: string; entry_id: string; kind: string; audio_url: string; created_at: string }[];

  const score = new Map<string, number>();
  const { data: totals } = await supabase
    .from("recording_vote_totals")
    .select("recording_id, up, down")
    .in("recording_id", rows.map((r) => r.id));
  for (const t of (totals ?? []) as any[]) score.set(t.recording_id, Number(t.up) - Number(t.down));

  const byEntry = new Map<string, typeof rows>();
  for (const r of rows) byEntry.set(r.entry_id, [...(byEntry.get(r.entry_id) ?? []), r]);
  for (const [entryId, recs] of byEntry) {
    // Readings of the word itself before example sentences; then the votes;
    // then age (the rows arrive oldest first, and sort is stable).
    const best = [...recs].sort(
      (a, b) =>
        Number(b.kind === "headword") - Number(a.kind === "headword") ||
        (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0)
    )[0];
    out.set(entryId, { count: recs.length, top: best?.audio_url ?? null });
  }
  return out;
}

/** Rows with senses joined → cards with live recording counts and the
 *  recording each card plays, in two round trips for the whole page. */
export async function toCards(supabase: { from: (t: string) => any }, rows: any[]): Promise<CardProps[]> {
  const summary = await recordingSummary(supabase, rows.map((r) => r.id));
  return rows.map((r) => {
    const s = summary.get(r.id);
    return { ...toCard(r, s?.count ?? 0), audio: s?.top ?? r.audio_url ?? null };
  });
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

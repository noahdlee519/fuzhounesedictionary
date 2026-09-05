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

/** Rows with senses joined → cards with live recording counts, in one round trip. */
export async function toCards(supabase: { from: (t: string) => any }, rows: any[]): Promise<CardProps[]> {
  const counts = await recordingCounts(supabase, rows.map((r) => r.id));
  return rows.map((r) => toCard(r, counts.get(r.id) ?? 0));
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

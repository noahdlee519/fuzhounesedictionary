import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/* Two numbers every visitor asks for and no visitor changes: how many words
   the dictionary has, and how many entries each filter chip on /learn would
   return. Both used to be computed on every request — the tally by pulling
   up to a thousand rows. They are public data, so a plain anon client (no
   cookies) can fetch them, and that is what lets them be cached across
   requests: a minute is plenty. An approval shows up in the counts within
   that minute. */

const TTL_SECONDS = 60;

function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Approved entries, or null when the database could not be reached. */
export const approvedCount = unstable_cache(
  async (): Promise<number | null> => {
    const db = anon();
    if (!db) return null;
    const { count, error } = await db
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");
    return error ? null : count ?? null;
  },
  ["approved-count"],
  { revalidate: TTL_SECONDS }
);

export interface FilterTally {
  pos: Record<string, number>;
  origin: Record<string, number>;
  known: boolean;
}

/** How many approved entries each part of speech and origin would match. */
export const filterTally = unstable_cache(
  async (): Promise<FilterTally> => {
    const empty: FilterTally = { pos: {}, origin: {}, known: false };
    const db = anon();
    if (!db) return empty;
    const { data, error } = await db
      .from("entries")
      .select("origin_area, senses(part_of_speech)")
      .eq("status", "approved")
      .range(0, 999);
    if (error || !data?.length) return empty;
    const pos: Record<string, number> = {};
    const origin: Record<string, number> = {};
    for (const row of data as any[]) {
      if (row.origin_area) origin[row.origin_area] = (origin[row.origin_area] ?? 0) + 1;
      // an entry counts once per part of speech, however many senses carry it
      const seen = new Set<string>();
      for (const s of row.senses ?? []) if (s?.part_of_speech) seen.add(s.part_of_speech);
      for (const p of seen) pos[p] = (pos[p] ?? 0) + 1;
    }
    return { pos, origin, known: true };
  },
  ["filter-tally"],
  { revalidate: TTL_SECONDS }
);

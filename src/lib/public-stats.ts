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

/** Whether a column exists on a table — one cheap HEAD request, cached.
 *
 *  entries.updated_at is added by supabase/updated_at.sql, which has to be
 *  run by hand in the Supabase SQL editor. Until it has been, sorting by
 *  "date edited" fails and the whole word list reads as unavailable. So the
 *  Browse page asks first, hides the chip while the answer is no, and picks
 *  it up on its own within the minute once the migration is run. */
const columnExists = unstable_cache(
  async (table: string, column: string): Promise<boolean> => {
    const db = anon();
    if (!db) return false;
    const { error } = await db.from(table).select(column, { head: true, count: "exact" }).limit(1);
    return !error;
  },
  ["column-exists"],
  { revalidate: TTL_SECONDS }
);

/** Is entries.updated_at there yet? (supabase/updated_at.sql) */
export function hasUpdatedAt(): Promise<boolean> {
  return columnExists("entries", "updated_at");
}

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
    // Supabase returns at most 1,000 rows per request; page through them.
    const data: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await db
        .from("entries")
        .select("origin_area, senses(part_of_speech)")
        .eq("status", "approved")
        .range(from, from + 999);
      if (error) return empty;
      data.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    if (!data.length) return empty;
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

export interface DistrictStat {
  code: string;
  /** Approved recordings from speakers of this district. */
  recordings: number;
  /** Of those, how many were the first recording their word ever got. */
  firsts: number;
}

export interface MissionTally {
  words: number;
  /** Approved recordings, plus the words recorded the old way (one file on the entry). */
  recordings: number;
  /** Entries with at least one approved recording (or a legacy audio file). */
  voiced: number;
  /** Distinct origin districts across approved recordings. */
  districts: number;
  /** Every origin area, with its recording counts (zero for the silent ones). */
  perDistrict: DistrictStat[];
  /** Ids of the voiced entries, sorted, for a deterministic word of the day. */
  voicedIds: string[];
}

/** The numbers the mission is measured by: words, words with a recording,
 *  how many districts those recordings come from, and the split by district
 *  for the segment bar on the home page. */
export const missionTally = unstable_cache(
  async (): Promise<MissionTally | null> => {
    const db = anon();
    if (!db) return null;
    const words = await db.from("entries").select("id", { count: "exact", head: true }).eq("status", "approved");
    if (words.error) return null;

    const voiced = new Set<string>();
    let recordings = 0;
    // earliest approved recording per entry, to credit "first voice" to a district
    const earliest = new Map<string, { at: string; area: string | null }>();
    const perDistrict = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from("recordings")
        .select("entry_id, origin_area, created_at")
        .eq("status", "approved")
        .range(from, from + 999);
      if (error) return null;
      for (const r of (data ?? []) as any[]) {
        recordings += 1;
        voiced.add(r.entry_id);
        if (r.origin_area) perDistrict.set(r.origin_area, (perDistrict.get(r.origin_area) ?? 0) + 1);
        const e = earliest.get(r.entry_id);
        if (!e || r.created_at < e.at) earliest.set(r.entry_id, { at: r.created_at, area: r.origin_area });
      }
      if (!data || data.length < 1000) break;
    }
    const firsts = new Map<string, number>();
    for (const e of earliest.values()) if (e.area) firsts.set(e.area, (firsts.get(e.area) ?? 0) + 1);

    // Words recorded the old way, as a single file on the entry.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from("entries")
        .select("id")
        .eq("status", "approved")
        .not("audio_url", "is", null)
        .range(from, from + 999);
      if (error) break;
      for (const e of (data ?? []) as any[]) {
        if (!voiced.has(e.id)) recordings += 1;
        voiced.add(e.id);
      }
      if (!data || data.length < 1000) break;
    }
    const { ORIGIN_AREAS } = await import("@/lib/origins");
    return {
      words: words.count ?? 0,
      recordings,
      voiced: voiced.size,
      districts: perDistrict.size,
      perDistrict: ORIGIN_AREAS.map((a) => ({
        code: a.code,
        recordings: perDistrict.get(a.code) ?? 0,
        firsts: firsts.get(a.code) ?? 0,
      })),
      voicedIds: Array.from(voiced).sort(),
    };
  },
  ["mission-tally-v3"],
  { revalidate: TTL_SECONDS }
);

export interface TopContributor {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  origin_area: string | null;
  recordings: number;
  words: number;
}

/** Approved recordings and words per contributor id. One pass over both
 *  tables, cached, and shared by the leaderboard and the head count. */
const contributionCounts = unstable_cache(
  async (): Promise<{ recs: Record<string, number>; words: Record<string, number> } | null> => {
    const db = anon();
    if (!db) return null;
    const recs: Record<string, number> = {};
    const words: Record<string, number> = {};
    for (const [table, into] of [["recordings", recs], ["entries", words]] as const) {
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db
          .from(table)
          .select("contributor_id")
          .eq("status", "approved")
          .not("contributor_id", "is", null)
          .range(from, from + 999);
        if (error) break;
        for (const r of (data ?? []) as any[]) into[r.contributor_id] = (into[r.contributor_id] ?? 0) + 1;
        if (!data || data.length < 1000) break;
      }
    }
    return { recs, words };
  },
  ["contribution-counts"],
  { revalidate: TTL_SECONDS }
);

/** How many people have an approved word or recording to their name. */
export async function contributorCount(): Promise<number | null> {
  const counts = await contributionCounts();
  if (!counts) return null;
  return new Set([...Object.keys(counts.recs), ...Object.keys(counts.words)]).size;
}

/** The people with the most approved recordings (words break ties), with
 *  only what their public profile already shows. */
export const topContributors = unstable_cache(
  async (limit = 4): Promise<TopContributor[]> => {
    const db = anon();
    const counts = await contributionCounts();
    if (!db || !counts) return [];
    const { recs, words } = counts;
    const ids = Array.from(new Set([...Object.keys(recs), ...Object.keys(words)]))
      .sort((a, b) => (recs[b] ?? 0) - (recs[a] ?? 0) || (words[b] ?? 0) - (words[a] ?? 0))
      .slice(0, limit);
    if (!ids.length) return [];
    const { data } = await db.from("profiles").select("id, display_name, avatar_url, origin_area").in("id", ids);
    const byId = new Map(((data ?? []) as any[]).map((p) => [p.id, p]));
    return ids
      .filter((id) => byId.has(id))
      .map((id) => ({
        id,
        display_name: byId.get(id).display_name ?? null,
        avatar_url: byId.get(id).avatar_url ?? null,
        origin_area: byId.get(id).origin_area ?? null,
        recordings: recs[id] ?? 0,
        words: words[id] ?? 0,
      }));
  },
  ["top-contributors-v2"],
  { revalidate: TTL_SECONDS }
);

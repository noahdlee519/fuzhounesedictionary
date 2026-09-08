import { formatOrigin } from "@/lib/origins";

/* People you can find on the site.

   A contributor is public exactly to the extent they already are: their
   display name and the origin they chose to publish (the database scrubs
   the rest), on the words and recordings that carry their name. So a search
   for people returns only those with at least one APPROVED word or
   recording — someone who signed in and never published anything does not
   appear, and nothing here reads email, editor status or pending items. */

export interface ContributorHit {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  origin: string | null;
  words: number;
  recordings: number;
}

type Db = { from: (t: string) => any };

/** Approved word and recording counts per contributor, for the given ids
 *  (or, with no ids, for everyone who has any). */
async function publicCounts(db: Db, ids?: string[]) {
  let entries = db.from("entries").select("contributor_id").eq("status", "approved").not("contributor_id", "is", null);
  let recs = db.from("recordings").select("contributor_id").eq("status", "approved").not("contributor_id", "is", null);
  if (ids) {
    entries = entries.in("contributor_id", ids);
    recs = recs.in("contributor_id", ids);
  }
  const [{ data: e }, { data: r }] = await Promise.all([entries, recs]);
  const words = new Map<string, number>();
  const recordings = new Map<string, number>();
  for (const row of (e ?? []) as { contributor_id: string }[]) words.set(row.contributor_id, (words.get(row.contributor_id) ?? 0) + 1);
  for (const row of (r ?? []) as { contributor_id: string }[]) recordings.set(row.contributor_id, (recordings.get(row.contributor_id) ?? 0) + 1);
  return { words, recordings };
}

function toHit(p: any, words: Map<string, number>, recordings: Map<string, number>): ContributorHit {
  return {
    id: p.id,
    display_name: p.display_name ?? null,
    avatar_url: p.avatar_url ?? null,
    origin: formatOrigin(p.origin_area, p.origin_locality),
    words: words.get(p.id) ?? 0,
    recordings: recordings.get(p.id) ?? 0,
  };
}

/** Contributors whose display name contains `q`, with something published. */
export async function searchContributors(db: Db, q: string, limit = 6): Promise<ContributorHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  // % and _ are LIKE wildcards; make them match themselves.
  const pattern = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const { data, error } = await db
    .from("profiles")
    .select("id, display_name, avatar_url, origin_area, origin_locality")
    .ilike("display_name", pattern)
    .limit(limit * 3);
  if (error || !data?.length) return [];
  const ids = data.map((p: any) => p.id);
  const { words, recordings } = await publicCounts(db, ids);
  return data
    .map((p: any) => toHit(p, words, recordings))
    .filter((h: ContributorHit) => h.words + h.recordings > 0)
    .sort((a: ContributorHit, b: ContributorHit) => b.words + b.recordings - (a.words + a.recordings))
    .slice(0, limit);
}

/** Everyone with something published — the assistant's people index. */
export async function publicContributors(db: Db, limit = 300): Promise<ContributorHit[]> {
  const { words, recordings } = await publicCounts(db);
  const ids = Array.from(new Set([...words.keys(), ...recordings.keys()])).slice(0, limit);
  if (!ids.length) return [];
  const { data } = await db
    .from("profiles")
    .select("id, display_name, avatar_url, origin_area, origin_locality")
    .in("id", ids);
  return ((data ?? []) as any[])
    .map((p) => toHit(p, words, recordings))
    .sort((a, b) => b.words + b.recordings - (a.words + a.recordings));
}

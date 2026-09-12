/* The content filter — "hide explicit words", on unless someone turns it off.

   A dictionary records what people say, and Fuzhounese swears like any other
   language, so the words stay in the database. What this does is keep them
   out of the two places a reader meets words they did not ask for: the word
   list and the search results. An entry reached on purpose still shows
   everything.

   What counts as explicit: a usage label the import carried over —
   "(vulgar)", "(offensive)" — or one of a short list of unambiguous English
   words in the meaning. The list is deliberately literal rather than clever:
   every pattern below is a plain substring, so the same rule can run in
   Postgres through PostgREST (`not ilike`) and in JavaScript, and the two
   can never disagree. That rules out anything needing word boundaries —
   "ass" would catch "arsenic", "damn" would catch "damning evidence" — so
   those are left out rather than half-handled.

   Shared by the server queries and the client, so it holds no imports. */

/** Cookie that turns the filter off. Absent (or anything but "off") = on. */
export const SAFE_COOKIE = "safe";

/** Substrings that mark a meaning as explicit, lower-cased. */
export const EXPLICIT_PATTERNS = [
  "(vulgar",
  "(offensive",
  "fuck",
  "cunt",
  "whore",
  "slut",
  "bitch",
  "bastard",
  "prostitut",
  "brothel",
  "masturbat",
  "penis",
  "testicl",
  "genital",
  "nipple",
] as const;

/** Does this meaning read as explicit? */
export function isExplicit(text?: string | null): boolean {
  if (!text) return false;
  const s = text.toLowerCase();
  return EXPLICIT_PATTERNS.some((p) => s.includes(p));
}

/** Add "and none of the explicit patterns" to a PostgREST query.
 *
 *  `column` is the definition column as the query sees it — "definition_en"
 *  when the senses table is the source, "senses.definition_en" when senses
 *  are embedded (in which case the embed has to be an inner join, or the
 *  entry stays and only its senses are filtered). */
export function withoutExplicit<T extends { not: (c: string, op: "ilike", v: string) => T }>(
  query: T,
  column: string
): T {
  let q = query;
  for (const pattern of EXPLICIT_PATTERNS) q = q.not(column, "ilike", `%${pattern}%`);
  return q;
}

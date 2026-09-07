import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import EntryCard, { type CardProps } from "@/components/EntryCard";
import { createClient } from "@/lib/supabase/server";
import type { SearchRow } from "@/lib/types";
import { recordingCounts, toCards } from "@/lib/entries";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string; auth_error?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const supabase = createClient();
  // Only for the assistant's sign-in gate; cache() shares the call with Header.
  const { user } = await getSessionUser();

  let results: CardProps[] = [];
  let total: number | null = null;
  let errored = false;

  try {
    if (q) {
      const { data, error } = await supabase.rpc("search_entries", { q });
      if (error) throw error;
      const rows = data as SearchRow[];
      const counts = await recordingCounts(supabase, rows.map((r) => r.id));
      results = rows.map((r) => ({
        id: r.id, hanzi: r.hanzi, romanization: r.romanization, headword: r.headword,
        pos: r.pos, gloss: r.short_gloss,
        recordings: (r.audio_url ? 1 : 0) + (counts.get(r.id) ?? 0),
      }));
    } else {
      // The newest twelve, and the size of the whole dictionary (a HEAD count,
      // no rows), fetched together.
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("entries")
          .select("id, hanzi, romanization, headword, audio_url, senses(definition_en, part_of_speech, sort)")
          .eq("status", "approved").order("created_at", { ascending: false }).limit(12),
        supabase.from("entries").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ]);
      results = await toCards(supabase, data ?? []);
      total = count ?? null;
    }
  } catch {
    errored = true;
  }

  return (
    <div className="space-y-8">
      {searchParams.auth_error && (
        <p
          role="alert"
          className="border-l-2 border-lacquer bg-surface px-4 py-3 text-sm text-inkSoft"
        >
          <span className="font-medium text-ink">Sign-in did not complete.</span>{" "}
          {searchParams.auth_error} Please try again, and if it keeps happening let Noah know what it
          says here.
        </p>
      )}

      <section className="space-y-4">
        <h1 className="font-display text-[22px] font-bold uppercase leading-tight tracking-tight text-balance text-ink sm:text-[28px]">
          The Collaborative Fuzhounese-English Dictionary
        </h1>
        <SearchBar defaultValue={q} signedIn={!!user} />
      </section>

      {errored && (
        <div className="border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">
          The dictionary is unavailable at the moment. Please check back shortly.
        </div>
      )}

      {q ? (
        <section className="space-y-3">
          <p className="border-t border-rule pt-4 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
          </p>
          {results.length === 0 && !errored && (
            <div className="border border-rule bg-surface p-6 text-center">
              <p className="text-inkSoft">No match yet.</p>
              <Link href={`/submit?romanization=${encodeURIComponent(q)}`} className="mt-2 inline-block font-medium text-lacquer hover:underline">
                Know this word? Add it →
              </Link>
            </div>
          )}
          <div className="grid gap-3">
            {results.map((e) => <EntryCard key={e.id} entry={e} />)}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-4 border-t border-rule pt-4 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
            <h2>Recently added</h2>
            {/* How big the dictionary is so far. Only when the count came back —
                a database blip must not print "0 words". */}
            {total !== null && (
              <span className="tabular-nums">
                {total.toLocaleString()} word{total === 1 ? "" : "s"} total
              </span>
            )}
          </div>
          <div className="grid gap-3">
            {results.map((e) => <EntryCard key={e.id} entry={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}

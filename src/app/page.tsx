import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import EntryCard, { type CardProps } from "@/components/EntryCard";
import { createClient } from "@/lib/supabase/server";
import type { SearchRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function firstSense(senses: any[] | null | undefined) {
  if (!senses || senses.length === 0) return null;
  return [...senses].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0];
}

export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const supabase = createClient();

  let results: CardProps[] = [];
  let count = 0;
  let audioCount = 0;
  let openRequests = 0;
  let errored = false;

  try {
    const { count: c } = await supabase
      .from("entries")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");
    count = c ?? 0;

    const { count: ac } = await supabase
      .from("entries")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .not("audio_url", "is", null);
    audioCount = ac ?? 0;

    if (q) {
      const { data, error } = await supabase.rpc("search_entries", { q });
      if (error) throw error;
      results = (data as SearchRow[]).map((r) => ({
        id: r.id,
        hanzi: r.hanzi,
        romanization: r.romanization,
        headword: r.headword,
        pos: r.pos,
        gloss: r.short_gloss,
        hasAudio: Boolean(r.audio_url),
      }));
    } else {
      const { data } = await supabase
        .from("entries")
        .select("id, hanzi, romanization, headword, audio_url, senses(definition_en, part_of_speech, sort)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(12);
      results = (data ?? []).map((e: any) => {
        const s = firstSense(e.senses);
        return {
          id: e.id,
          hanzi: e.hanzi,
          romanization: e.romanization,
          headword: e.headword,
          pos: s?.part_of_speech ?? null,
          gloss: s?.definition_en ?? null,
          hasAudio: Boolean(e.audio_url),
        };
      });
    }
  } catch {
    errored = true;
  }

  // The "words wanted" tally lives in a table added by supabase/word_requests.sql.
  // Keep it optional so the homepage still works before that migration is run.
  try {
    const { count: rc } = await supabase
      .from("word_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
    openRequests = rc ?? 0;
  } catch {
    openRequests = 0;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 text-center">
        <h1 className="font-serif text-3xl font-bold">A dictionary of Fuzhounese</h1>
        <p className="text-stone-600 dark:text-stone-400">
          福州話 · Foochow · Eastern Min
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-stone-500">
          <span><b className="font-semibold text-accent tabular-nums">{count.toLocaleString()}</b> words</span>
          <span aria-hidden className="text-stone-300">·</span>
          <span><b className="font-semibold text-accent tabular-nums">{audioCount.toLocaleString()}</b> voices recorded</span>
          <span aria-hidden className="text-stone-300">·</span>
          <Link href="/wanted" className="hover:text-accent">
            <b className="font-semibold text-accent tabular-nums">{openRequests.toLocaleString()}</b> words wanted →
          </Link>
        </div>
      </section>

      <SearchBar defaultValue={q} />

      {errored && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Couldn&apos;t reach the database. Make sure <code>.env.local</code> is set and you&apos;ve run
          the SQL in <code>supabase/schema.sql</code>. (See the README.)
        </div>
      )}

      {q ? (
        <section className="space-y-3">
          <p className="text-sm text-stone-500">
            {results.length} result{results.length === 1 ? "" : "s"} for{" "}
            <span className="font-semibold">&ldquo;{q}&rdquo;</span>
          </p>
          {results.length === 0 && !errored && (
            <div className="rounded-lg border border-stone-200 bg-white p-6 text-center dark:bg-stone-900 dark:border-stone-700">
              <p className="text-stone-600 dark:text-stone-300">No match yet.</p>
              <Link
                href={`/submit?romanization=${encodeURIComponent(q)}`}
                className="mt-2 inline-block font-medium text-accent hover:underline"
              >
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Recently added</h2>
          <div className="grid gap-3">
            {results.map((e) => <EntryCard key={e.id} entry={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}

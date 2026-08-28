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
      .from("entries").select("*", { count: "exact", head: true }).eq("status", "approved");
    count = c ?? 0;

    const { count: ac } = await supabase
      .from("entries").select("*", { count: "exact", head: true })
      .eq("status", "approved").not("audio_url", "is", null);
    audioCount = ac ?? 0;

    if (q) {
      const { data, error } = await supabase.rpc("search_entries", { q });
      if (error) throw error;
      results = (data as SearchRow[]).map((r) => ({
        id: r.id, hanzi: r.hanzi, romanization: r.romanization, headword: r.headword,
        pos: r.pos, gloss: r.short_gloss, hasAudio: Boolean(r.audio_url),
      }));
    } else {
      const { data } = await supabase
        .from("entries")
        .select("id, hanzi, romanization, headword, audio_url, senses(definition_en, part_of_speech, sort)")
        .eq("status", "approved").order("created_at", { ascending: false }).limit(12);
      results = (data ?? []).map((e: any) => {
        const s = firstSense(e.senses);
        return {
          id: e.id, hanzi: e.hanzi, romanization: e.romanization, headword: e.headword,
          pos: s?.part_of_speech ?? null, gloss: s?.definition_en ?? null, hasAudio: Boolean(e.audio_url),
        };
      });
    }
  } catch {
    errored = true;
  }

  try {
    const { count: rc } = await supabase
      .from("word_requests").select("*", { count: "exact", head: true }).eq("status", "open");
    openRequests = rc ?? 0;
  } catch {
    openRequests = 0;
  }

  return (
    <div className="space-y-10">
      <section className="border-b border-rule pb-8">
        <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-balance text-ink sm:text-6xl">
          The Collaborative Fuzhounese-English Dictionary
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-1 font-mono text-sm text-inkSoft">
          <span><b className="font-semibold tabular-nums text-lacquer">{count.toLocaleString()}</b> words</span>
          <span aria-hidden className="text-rule">/</span>
          <span><b className="font-semibold tabular-nums text-lacquer">{audioCount.toLocaleString()}</b> voices recorded</span>
          <span aria-hidden className="text-rule">/</span>
          <Link href="/request" className="hover:text-lacquer">
            <b className="font-semibold tabular-nums text-lacquer">{openRequests.toLocaleString()}</b> words wanted →
          </Link>
        </div>
      </section>

      <SearchBar defaultValue={q} />

      {errored && (
        <div className="border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">
          Couldn&apos;t reach the database. Make sure <code className="font-mono">.env.local</code> is set and
          you&apos;ve run the SQL in <code className="font-mono">supabase/schema.sql</code>. (See the README.)
        </div>
      )}

      {q ? (
        <section className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-wider text-inkFaint">
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
          <h2 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-inkFaint">Recently added</h2>
          <div className="grid gap-3">
            {results.map((e) => <EntryCard key={e.id} entry={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}

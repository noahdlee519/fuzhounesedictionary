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
  let errored = false;

  try {
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

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-balance text-ink sm:text-[26px]">
          The Collaborative Fuzhounese Dictionary
        </h1>
        <SearchBar defaultValue={q} />
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
          <h2 className="border-t border-rule pt-4 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Recently added</h2>
          <div className="grid gap-3">
            {results.map((e) => <EntryCard key={e.id} entry={e} />)}
          </div>
        </section>
      )}
    </div>
  );
}

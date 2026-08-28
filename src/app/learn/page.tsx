import Link from "next/link";
import EntryCard, { type CardProps } from "@/components/EntryCard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

function firstSense(senses: any[] | null | undefined) {
  if (!senses || senses.length === 0) return null;
  return [...senses].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0];
}

export default async function BrowsePage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createClient();
  const { data, count } = await supabase
    .from("entries")
    .select("id, hanzi, romanization, headword, audio_url, senses(definition_en, part_of_speech, sort)", { count: "exact" })
    .eq("status", "approved")
    .order("headword", { ascending: true })
    .range(from, to);

  const entries: CardProps[] = (data ?? []).map((e: any) => {
    const s = firstSense(e.senses);
    return {
      id: e.id, hanzi: e.hanzi, romanization: e.romanization, headword: e.headword,
      pos: s?.part_of_speech ?? null, gloss: s?.definition_en ?? null, hasAudio: Boolean(e.audio_url),
    };
  });

  const total = count ?? 0;
  const hasNext = to + 1 < total;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-4">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">Browse all words</h1>
        <span className="font-mono text-xs uppercase tracking-wider text-inkFaint">{total.toLocaleString()} entries</span>
      </div>

      <div className="grid gap-3">
        {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
        {entries.length === 0 && (
          <p className="text-inkSoft">No approved words yet. Be the first to add one!</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-5 font-mono text-xs uppercase tracking-wider">
        {page > 1 ? (
          <Link href={`/learn?page=${page - 1}`} className="text-inkSoft hover:text-lacquer">← Previous</Link>
        ) : <span />}
        <span className="text-inkFaint">Page {page}</span>
        {hasNext ? (
          <Link href={`/learn?page=${page + 1}`} className="text-inkSoft hover:text-lacquer">Next →</Link>
        ) : <span />}
      </div>
    </div>
  );
}

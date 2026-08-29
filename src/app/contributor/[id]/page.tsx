import Link from "next/link";
import { notFound } from "next/navigation";
import EntryCard, { type CardProps } from "@/components/EntryCard";
import { createClient } from "@/lib/supabase/server";
import { formatOrigin } from "@/lib/origins";

export const dynamic = "force-dynamic";

function firstSense(senses: any[] | null | undefined) {
  if (!senses || senses.length === 0) return null;
  return [...senses].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0];
}

export default async function ContributorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, origin_area, origin_locality, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!profile) notFound();

  const { data, count } = await supabase
    .from("entries")
    .select("id, hanzi, romanization, headword, audio_url, senses(definition_en, part_of_speech, sort)", {
      count: "exact",
    })
    .eq("contributor_id", params.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(60);

  const entries: CardProps[] = (data ?? []).map((e: any) => {
    const s = firstSense(e.senses);
    return {
      id: e.id, hanzi: e.hanzi, romanization: e.romanization, headword: e.headword,
      pos: s?.part_of_speech ?? null, gloss: s?.definition_en ?? null, hasAudio: Boolean(e.audio_url),
    };
  });

  const origin = formatOrigin(profile.origin_area, profile.origin_locality);
  const total = count ?? 0;
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-8">
      <section className="border-b border-rule pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">Contributor</p>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          {profile.display_name || "Anonymous contributor"}
        </h1>
        {origin && (
          <p className="mt-3 text-inkSoft">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Fuzhounese from </span>
            {origin}
          </p>
        )}
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          {total.toLocaleString()} word{total === 1 ? "" : "s"} · joined {joined}
        </p>
      </section>

      <section className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-inkSoft">No published words yet.</p>
        ) : (
          <div className="grid gap-3">
            {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
          </div>
        )}
      </section>

      <p className="border-t border-rule pt-5">
        <Link href="/learn" className="font-mono text-xs uppercase tracking-[0.1em] text-inkSoft hover:text-lacquer">
          Browse all words →
        </Link>
      </p>
    </div>
  );
}

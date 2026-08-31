import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { requestWord } from "@/app/request/actions";
import type { Sense } from "@/lib/types";
import { formatOrigin } from "@/lib/origins";
import { firstSense, entryTitle } from "@/lib/entries";
import { SITE_NAME } from "@/lib/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("entries")
    .select("headword, hanzi, romanization, senses(definition_en, part_of_speech, sort)")
    .eq("id", params.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!data) return { title: "Word not found" };

  const name = entryTitle(data as any);
  const sense = firstSense((data as any).senses);
  const gloss = sense?.definition_en ? `\u201c${sense.definition_en}\u201d` : "";
  const description = `${name} in Fuzhounese${gloss ? ` means ${gloss}` : ""}. Definitions, romanization and pronunciation from the ${SITE_NAME}.`;

  return {
    title: name,
    description,
    alternates: { canonical: `/entry/${params.id}` },
    openGraph: { type: "article", title: `${name} \u00b7 ${SITE_NAME}`, description },
    twitter: { card: "summary", title: `${name} \u00b7 ${SITE_NAME}`, description },
  };
}

export default async function EntryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { user } = await getSessionUser();
  const { data: entry } = await supabase
    .from("entries")
    .select("*, senses(*), contributor:profiles(id, display_name)")
    .eq("id", params.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!entry) notFound();

  const senses: Sense[] = [...(entry.senses ?? [])].sort(
    (a: Sense, b: Sense) => (a.sort ?? 0) - (b.sort ?? 0)
  );
  const contributor = (entry as any).contributor as
    | { id: string; display_name: string | null }
    | null;
  const credit = contributor?.display_name ?? undefined;
  const wordOrigin = formatOrigin((entry as any).origin_area, (entry as any).origin_locality);

  return (
    <article className="space-y-7">
      <Link href="/" className="font-mono text-xs uppercase tracking-wider text-inkFaint hover:text-lacquer">
        ← Back to search
      </Link>

      <header className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-rule pb-5">
        {entry.hanzi && <h1 className="font-display text-6xl font-extrabold leading-none">{entry.hanzi}</h1>}
        <span className="romanization font-display text-3xl font-semibold text-lacquer">
          {entry.romanization || entry.headword}
        </span>
        {entry.ipa && <span className="font-mono text-inkFaint">/{entry.ipa}/</span>}
        {(wordOrigin || entry.variety) && (
          <span className="font-mono text-[11px] uppercase tracking-wide text-inkSoft ring-1 ring-rule px-2 py-1">
            {wordOrigin || entry.variety}
          </span>
        )}
      </header>

      {entry.audio_url ? (
        <audio controls src={entry.audio_url} className="w-full max-w-sm">
          Your browser does not support audio playback.
        </audio>
      ) : (
        <div className="border border-dashed border-rule p-4">
          <p className="text-sm text-inkSoft">No pronunciation yet. Know how this is said?</p>
          {user ? (
            <form action={requestWord} className="mt-3">
              <input type="hidden" name="entry_id" value={entry.id} />
              <input type="hidden" name="term" value={entry.hanzi || entry.romanization || entry.headword} />
              <input type="hidden" name="back" value={`/entry/${entry.id}`} />
              <button className="border border-lacquer bg-lacquer px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-paper transition-colors hover:bg-transparent hover:text-lacquer">
                🔊 Request a pronunciation
              </button>
            </form>
          ) : (
            <Link href="/request" className="mt-2 inline-block text-sm text-lacquer hover:underline">
              Sign in to request a recording →
            </Link>
          )}
        </div>
      )}

      <ol className="space-y-5">
        {senses.map((s, i) => (
          <li key={s.id} className="border-l-2 border-lacquer pl-5">
            <div className="flex items-baseline gap-2 font-mono text-xs uppercase tracking-wider text-inkFaint">
              <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {s.part_of_speech && <span className="italic text-lacquer">{s.part_of_speech}</span>}
            </div>
            <p className="mt-1 text-lg">{s.definition_en}</p>
            {s.gloss_zh && <p className="text-inkSoft">中文：{s.gloss_zh}</p>}
            {s.example && (
              <p className="mt-1 text-sm">
                <span className="romanization text-inkSoft">{s.example}</span>
                {s.example_gloss && <span className="text-inkFaint">—{s.example_gloss}</span>}
              </p>
            )}
          </li>
        ))}
      </ol>

      {entry.notes && (
        <div className="bg-surface p-4 text-sm text-inkSoft">
          <span className="font-mono text-xs uppercase tracking-wide text-inkFaint">Notes </span>
          {entry.notes}
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            name: entry.hanzi || entry.romanization || entry.headword,
            alternateName: entry.romanization || undefined,
            description: senses.map((s) => s.definition_en).join("; "),
            inDefinedTermSet: {
              "@type": "DefinedTermSet",
              name: "Fuzhounese Dictionary",
              url: "https://fuzhounese.org",
            },
            inLanguage: "cdo",
          }),
        }}
      />

      <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
        Added {new Date(entry.created_at).toLocaleDateString()}
        {contributor && (
          <>
            {" · contributed by "}
            <Link href={`/contributor/${contributor.id}`} className="hover:text-lacquer">
              {credit || "a contributor"}
            </Link>
          </>
        )}
      </p>
    </article>
  );
}

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
import Recorder from "@/components/Recorder";
import SignInButton from "@/components/SignInButton";
import RecordingList, { type RecordingRow } from "@/components/RecordingList";
import { MAX_RECORDINGS_PER_WORD } from "@/lib/constants";

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

  // Recordings the viewer is allowed to hear: approved ones, plus their own
  // pending ones so they can tell their upload worked. RLS does the filtering.
  const { data: recRows } = await supabase
    .from("recordings")
    .select("id, kind, sense_id, audio_url, status, origin_area, origin_locality, created_at, contributor:profiles(id, display_name)")
    .eq("entry_id", params.id)
    .order("created_at", { ascending: true });
  // supabase-js types a to-one embed as an array; flatten it once here rather
  // than casting at every use site.
  const recordings: RecordingRow[] = (recRows ?? []).map((r: any) => ({
    ...r,
    contributor: Array.isArray(r.contributor) ? r.contributor[0] ?? null : r.contributor ?? null,
  }));
  const headwordRecs = recordings.filter((r: any) => r.kind === "headword");
  const exampleRecs = (senseId: string) =>
    recordings.filter((r: any) => r.kind === "example" && r.sense_id === senseId);

  // The viewer's own takes on this word, in any state but rejected — the same
  // count the database uses for the two-per-word cap. RLS returns a person's
  // own rows whatever their status, so this is complete for the viewer.
  const myTakes = user
    ? recordings.filter((r) => r.contributor?.id === user.id && r.status !== "rejected").length
    : 0;
  const capped = myTakes >= MAX_RECORDINGS_PER_WORD;
  const cappedNote = (
    <p className="text-sm text-inkFaint">
      You have recorded this word twice, which is the limit per word.
    </p>
  );

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
        {/* && binds tighter than ?: — the old form fell into the else branch
            and drew an empty bordered pill on every entry with no origin. */}
        {wordOrigin && (entry as any).origin_area ? (
          <Link
            href={`/learn?origin=${encodeURIComponent((entry as any).origin_area)}`}
            className="font-mono text-[11px] uppercase tracking-wide text-inkSoft ring-1 ring-rule px-2 py-1 hover:text-lacquer hover:ring-lacquer"
          >
            {wordOrigin}
          </Link>
        ) : entry.variety ? (
          <span className="font-mono text-[11px] uppercase tracking-wide text-inkSoft ring-1 ring-rule px-2 py-1">
            {entry.variety}
          </span>
        ) : null}
      </header>

      <section className="space-y-3">
        {/* the legacy single-file column still plays, if it holds anything */}
        {entry.audio_url && (
          <audio controls src={entry.audio_url} className="w-full max-w-sm">
            Your browser does not support audio playback.
          </audio>
        )}

        <RecordingList recordings={headwordRecs} />

        {user ? (
          <div className="border border-dashed border-rule p-4">
            {capped ? (
              cappedNote
            ) : (
              <Recorder
                userId={user.id}
                entryId={entry.id}
                kind="headword"
                label={
                  headwordRecs.length || entry.audio_url
                    ? "Add your pronunciation of this word"
                    : "Be the first to say this word"
                }
              />
            )}
          </div>
        ) : (
          !entry.audio_url &&
          headwordRecs.length === 0 && (
            <div className="border border-dashed border-rule p-4">
              <p className="text-sm text-inkSoft">No pronunciation yet. Know how this is said?</p>
              <form action={requestWord} className="mt-3">
                <input type="hidden" name="entry_id" value={entry.id} />
                <input type="hidden" name="term" value={entry.hanzi || entry.romanization || entry.headword} />
                <input type="hidden" name="back" value={`/entry/${entry.id}`} />
                <button className="border border-lacquer bg-lacquer px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] text-paper transition-colors hover:bg-transparent hover:text-lacquer">
                  Ask for a recording
                </button>
              </form>
              <div className="mt-3">
                <SignInButton
                  next={`/entry/${entry.id}`}
                  label="Or sign in and record it yourself →"
                  className="text-sm text-lacquer hover:underline"
                />
              </div>
            </div>
          )
        )}
      </section>

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
            {s.example && (
              <div className="mt-2 space-y-2">
                <RecordingList recordings={exampleRecs(s.id)} compact />
                {user && !capped && (
                  <Recorder
                    userId={user.id}
                    entryId={entry.id}
                    kind="example"
                    senseId={s.id}
                    label="Read this sentence aloud"
                  />
                )}
              </div>
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

      {/* JSON.stringify does not escape "<", so a definition containing
          "</script>" would close this element and the rest would run as HTML.
          \u003c is still valid JSON and the browser never sees a "<". */}
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
          }).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026"),
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

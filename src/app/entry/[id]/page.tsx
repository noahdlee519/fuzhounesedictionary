import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { requestWord } from "@/app/request/actions";
import type { EntryWithSenses, Sense } from "@/lib/types";
import { formatOrigin } from "@/lib/origins";
import { firstSense, sortSenses, one, entryTitle } from "@/lib/entries";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { LEGAL_CONTACT } from "@/components/Legal";
import type { Metadata } from "next";
import Recorder from "@/components/Recorder";
import SignInButton from "@/components/SignInButton";
import PlayButton from "@/components/PlayButton";
import { formatDate } from "@/lib/dates";
import RecordingList, { type RecordingRow } from "@/components/RecordingList";
import DeleteEntry from "@/components/DeleteEntry";
import SavedNotice from "@/components/SavedNotice";
import type { VoteState } from "@/components/VoteButtons";
import BackLink from "@/components/BackLink";
import EditLink from "@/components/EditLink";
import { MAX_RECORDINGS_PER_WORD } from "@/lib/constants";

export const dynamic = "force-dynamic";

/* generateMetadata and the page both need the entry. cache() dedupes the two
   calls within one request, so the database is asked once, not twice. */
const loadEntry = cache(async (id: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("entries")
    .select("*, senses(*), contributor:profiles(id, display_name)")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  return data as (EntryWithSenses & { senses: Sense[] }) | null;
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await loadEntry(params.id);
  if (!data) return { title: "Word not found" };

  const name = entryTitle(data);
  const sense = firstSense(data.senses);
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

/* Notes are plain text, but imported entries carry a source URL (Wiktionary
   requires the link). Bare URLs become links that may break anywhere, so a
   long one wraps inside a phone screen instead of running off it. */
function linkifyNotes(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /https?:\/\/[^\s]+?(?=[.,;)]?(?:\s|$))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const url = m[0];
    let label = url;
    try {
      const u = new URL(url);
      label = u.hostname.replace(/^www\./, "") + decodeURIComponent(u.pathname).replace(/#.*$/, "");
    } catch {}
    out.push(
      <a key={m.index} href={url} target="_blank" rel="noreferrer" className="break-all text-lacquer hover:underline">
        {label}
      </a>
    );
    last = m.index + url.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* Words that share a character with this one: 鼎邊 finds 鼎邊糊, 愛 finds
   愛情, 龍 finds the dragon compounds. Whole-word containment first (the
   compound built on this word), then shorter words before longer, so the
   list reads from nearest to furthest. Up to eight. */
interface RelatedWord {
  id: string;
  hanzi: string | null;
  romanization: string | null;
  headword: string;
}
async function relatedWords(
  supabase: ReturnType<typeof createClient>,
  id: string,
  hanzi: string | null
): Promise<RelatedWord[]> {
  const chars = Array.from(new Set(Array.from(hanzi ?? "").filter((c) => /\p{Script=Han}/u.test(c)))).slice(0, 4);
  if (!chars.length) return [];
  const { data } = await supabase
    .from("entries")
    .select("id, hanzi, romanization, headword")
    .eq("status", "approved")
    .neq("id", id)
    .or(chars.map((c) => `hanzi.ilike.%${c}%`).join(","))
    .limit(40);
  const whole = hanzi ?? "";
  return ((data ?? []) as RelatedWord[])
    .sort((a, b) => {
      const ac = whole.length > 1 && (a.hanzi ?? "").includes(whole) ? 0 : 1;
      const bc = whole.length > 1 && (b.hanzi ?? "").includes(whole) ? 0 : 1;
      return ac - bc || (a.hanzi ?? "").length - (b.hanzi ?? "").length || (a.hanzi ?? "").localeCompare(b.hanzi ?? "");
    })
    .slice(0, 8);
}

export default async function EntryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; problem?: string };
}) {
  const supabase = createClient();
  // None of these depend on each other, so they go out together. Recordings
  // are keyed by entry id, not by the entry row, and RLS filters them to what
  // the viewer may hear: approved ones plus their own pending ones.
  const [{ user, profile }, entry, { data: recRows }] = await Promise.all([
    getSessionUser(),
    loadEntry(params.id),
    supabase
      .from("recordings")
      .select("id, kind, sense_id, audio_url, status, note, origin_area, origin_locality, created_at, contributor:profiles(id, display_name)")
      .eq("entry_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!entry) notFound();

  const related = await relatedWords(supabase, entry.id, entry.hanzi);

  // Editors can remove a recording from here, without a trip to the queue.
  const canDelete = Boolean(profile?.is_editor);
  const here = `/entry/${entry.id}`;

  const recordings: RecordingRow[] = (recRows ?? []).map((r: any) => ({
    ...r,
    contributor: one(r.contributor),
  }));

  // Thumbs up/down: public totals from the view, plus the viewer's own votes.
  // Both tolerate the table not existing yet (supabase/recording_votes.sql).
  const recIds = recordings.map((r) => r.id);
  const votes = new Map<string, VoteState>();
  if (recIds.length) {
    const [{ data: totals }, { data: mine }] = await Promise.all([
      supabase.from("recording_vote_totals").select("recording_id, up, down").in("recording_id", recIds),
      user
        ? supabase.from("recording_votes").select("recording_id, value").eq("user_id", user.id).in("recording_id", recIds)
        : Promise.resolve({ data: null as { recording_id: string; value: number }[] | null }),
    ]);
    for (const t of (totals ?? []) as any[]) votes.set(t.recording_id, { up: Number(t.up), down: Number(t.down), mine: null });
    for (const v of (mine ?? []) as any[]) {
      const cur = votes.get(v.recording_id) ?? { up: 0, down: 0, mine: null };
      votes.set(v.recording_id, { ...cur, mine: v.value === 1 ? 1 : -1 });
    }
  }
  const headwordRecs = recordings.filter((r) => r.kind === "headword");
  const exampleRecs = (senseId: string) =>
    recordings.filter((r) => r.kind === "example" && r.sense_id === senseId);

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

  const senses = sortSenses(entry.senses);
  const contributor = one(entry.contributor);
  const credit = contributor?.display_name ?? undefined;
  const wordOrigin = formatOrigin(entry.origin_area, entry.origin_locality);

  return (
    <article className="space-y-7">
      <BackLink
        fallback="/"
        fallbackLabel="← Back to search"
        className="font-mono text-xs uppercase tracking-wider text-inkFaint hover:text-lacquer"
      />

      <header className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-rule pb-5">
        {entry.hanzi && <h1 className="font-display text-6xl font-extrabold leading-none">{entry.hanzi}</h1>}
        <span className="romanization font-display text-3xl font-semibold text-lacquer">
          {entry.romanization || entry.headword}
        </span>
        {entry.ipa && <span className="font-mono text-inkFaint">/{entry.ipa}/</span>}
        {/* && binds tighter than ?: — the old form fell into the else branch
            and drew an empty bordered pill on every entry with no origin. */}
        {wordOrigin && entry.origin_area ? (
          <Link
            href={`/browse?origin=${encodeURIComponent(entry.origin_area)}`}
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

      {(searchParams.saved || searchParams.problem) && (
        <p className="flex items-center gap-3 border-l-2 border-lacquer bg-surface px-4 py-2 text-sm text-inkSoft">
          {searchParams.saved ? (
            <SavedNotice message="Note saved" />
          ) : (
            <span role="alert">The note could not be saved. Please try again.</span>
          )}
        </p>
      )}

      <section id="recordings" className="scroll-mt-20 space-y-3">
        {/* the legacy single-file column still plays, if it holds anything */}
        {entry.audio_url && (
          <div className="flex items-center gap-3">
            <PlayButton src={entry.audio_url} label={`${entryTitle(entry)}, the original recording`} />
            <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">
              submitted with the word
            </span>
          </div>
        )}

        <RecordingList recordings={headwordRecs} canDelete={canDelete} back={here} viewerId={user?.id} votes={votes} />

        {user ? (
          <div className="border border-dashed border-rule p-4">
            {capped ? (
              cappedNote
            ) : (
              <Recorder
                userId={user.id}
                entryId={entry.id}
                isEditor={canDelete}
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
              <p className="text-sm text-inkSoft">
                No recording yet. If you know how this is said, your recording is the one thing this
                page is missing.
              </p>
              {/* Recording it is the valuable act, so it gets the filled button;
                  asking someone else to is the fallback, as a text link. */}
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <SignInButton
                  next={`/entry/${entry.id}`}
                  label="Sign in and record it"
                  className="inline-flex items-center gap-2 border border-lacquer bg-lacquer px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] text-paper transition-colors hover:bg-transparent hover:text-lacquer [&>svg]:hidden"
                />
                <form action={requestWord}>
                  <input type="hidden" name="entry_id" value={entry.id} />
                  <input type="hidden" name="term" value={entry.hanzi || entry.romanization || entry.headword} />
                  <input type="hidden" name="back" value={`/entry/${entry.id}`} />
                  <button className="text-sm text-lacquer hover:underline">
                    Can&apos;t? Ask for a recording →
                  </button>
                </form>
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
                <RecordingList recordings={exampleRecs(s.id)} compact canDelete={canDelete} back={here} viewerId={user?.id} votes={votes} />
                {user && !capped && (
                  <Recorder
                    userId={user.id}
                    entryId={entry.id}
                    isEditor={canDelete}
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

      {related.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Related words</h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/entry/${r.id}`}
                  className="inline-flex items-baseline gap-1.5 border border-rule px-2.5 py-1 text-[13px] transition-colors hover:border-lacquer hover:text-lacquer"
                >
                  {r.hanzi && <span className="font-display font-semibold">{r.hanzi}</span>}
                  <span className="romanization text-inkSoft">{r.romanization || r.headword}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {entry.notes && (
        <div className="bg-surface p-4 text-sm text-inkSoft [overflow-wrap:anywhere]">
          <span className="font-mono text-xs uppercase tracking-wide text-inkFaint">Notes </span>
          {linkifyNotes(entry.notes)}
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
              name: SITE_NAME,
              url: "https://fuzhounese.org",
            },
            inLanguage: "cdo",
          }).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026"),
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          Added {formatDate(entry.created_at)}
          {contributor && (
            <>
              {" · contributed by "}
              <Link href={`/contributor/${contributor.id}`} className="hover:text-lacquer">
                {credit || "a contributor"}
              </Link>
            </>
          )}
        </p>
        <span className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Anyone can flag an entry; the terms say what happens next. The
              subject carries the page so the report is usable as sent. */}
          <a
            href={`mailto:${LEGAL_CONTACT}?subject=${encodeURIComponent(`Suggested edit: ${entryTitle(entry)} (${SITE_URL}${here})`)}&body=${encodeURIComponent("What should change, and why:\n\n")}`}
            className="font-mono text-[11px] uppercase tracking-wide text-inkFaint hover:text-lacquer"
          >
            Suggest an edit
          </a>
          <a
            href={`mailto:${LEGAL_CONTACT}?subject=${encodeURIComponent(`Report: ${entryTitle(entry)} (${SITE_URL}${here})`)}`}
            className="font-mono text-[11px] uppercase tracking-wide text-inkFaint hover:text-lacquer"
          >
            Report
          </a>
        {canDelete && (
          <span className="flex flex-wrap items-center gap-3">
            <EditLink
              entryId={entry.id}
              here={here}
              className="font-mono text-[11px] uppercase tracking-wide text-inkFaint hover:text-lacquer"
            />
            <DeleteEntry id={entry.id} back="/learn" />
          </span>
        )}
        </span>
      </div>
    </article>
  );
}

import Link from "next/link";
import EntryCard, { type CardProps } from "@/components/EntryCard";
import { createClient } from "@/lib/supabase/server";
import { PARTS_OF_SPEECH } from "@/lib/constants";
import { recordingCounts, toCard } from "@/lib/entries";
import { ORIGIN_AREAS, ORIGIN_GROUPS, originArea } from "@/lib/origins";
import type { Metadata } from "next";
import Guide, { Contents, Sources } from "./Guide";
import LearnPanels from "./LearnPanels";
import { learnPanels } from "./panels";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

/* Guide temporarily hidden while Noah edits the teaching content — 2026-09-01.
   Flip this back to true to restore the contents list, all ten sections and the
   sources block. Nothing was deleted; Guide.tsx is untouched. */
const SHOW_GUIDE: boolean = false;

/* ---------------------------------------------------------------------------
   Sorting.

   Fuzhounese sorts run in the database on entries.headword, so they stay
   paginated and cheap. English sorts cannot: the gloss lives on senses, a
   to-many relation, and PostgREST will not order a parent by a child column.
   Those are sorted in memory instead — fine at this size, but see SORT_CAP.
   --------------------------------------------------------------------------- */
const SORTS = {
  "fz-az": { label: "Fuzhounese A–Z", lang: "fz", asc: true },
  "fz-za": { label: "Fuzhounese Z–A", lang: "fz", asc: false },
  "en-az": { label: "English A–Z", lang: "en", asc: true },
  "en-za": { label: "English Z–A", lang: "en", asc: false },
} as const;

type SortKey = keyof typeof SORTS;
const DEFAULT_SORT: SortKey = "fz-az";
const SORT_KEYS = Object.keys(SORTS) as SortKey[];

/* An English sort has to hold every matching entry in memory at once. Supabase
   caps a request at 1000 rows anyway, so that is the honest ceiling. Past it,
   the fix is a database view carrying each entry's primary gloss as a column,
   which restores server-side ordering. Not worth building at 117 entries. */
const SORT_CAP = 1000;

const collator = new Intl.Collator("en", { sensitivity: "base" });

/* Two of the parts of speech mean nothing to most English speakers, and they
   are exactly the ones a Fuzhounese learner most needs explained. Each gets a
   hover note on its filter chip. Grounded in words actually in the dictionary:
   the particles are 賣, 各, 未; the measure words are 隻 and 本. */
const POS_NOTES: Record<string, string> = {
  particle:
    "A short word that carries no meaning on its own but does grammatical work\u2014turning a statement into a question, marking a plural, or showing that something has already happened.",
  "measure word":
    "A counting word that goes between a number and a noun, like the \u201csheets\u201d in \u201cthree sheets of paper\u201d. Fuzhounese needs one, and which word you use depends on the kind of thing being counted.",
};

export const metadata: Metadata = {
  title: "Learn Fuzhounese",
  description: SHOW_GUIDE
    ? "How Fuzhounese works: its seven tones, tone sandhi, initial assimilation, how it is written down, how it differs from Mandarin, a phrasebook, and every word in the dictionary A to Z."
    : "How Fuzhounese works — its tones, tone sandhi, measure words and how it is written — and every word in the dictionary, A to Z.",
  alternates: { canonical: "/learn" },
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { page?: string; pos?: string; origin?: string; sort?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const posParam = (searchParams.pos ?? "").trim();
  const pos = (PARTS_OF_SPEECH as readonly string[]).includes(posParam) ? posParam : "";

  const originParam = (searchParams.origin ?? "").trim();
  const origin = originArea(originParam) ? originParam : "";

  const sortParam = (searchParams.sort ?? "").trim();
  const sort: SortKey = SORT_KEYS.includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : DEFAULT_SORT;
  const { lang, asc } = SORTS[sort];

  const supabase = createClient();
  const senseCols = "definition_en, part_of_speech, sort";
  const cols = `id, hanzi, romanization, headword, audio_url, senses${pos ? "!inner" : ""}(${senseCols})`;

  const base = () => {
    let q = supabase.from("entries").select(cols, { count: "exact" }).eq("status", "approved");
    if (pos) q = q.eq("senses.part_of_speech", pos);
    if (origin) q = q.eq("origin_area", origin);
    return q;
  };

  let entries: CardProps[] = [];
  let total = 0;
  // A failed query must not read as "no words yet" — that is a lie with a
  // call to action attached. Tracked and rendered as an unavailable panel.
  let failed = false;

  if (lang === "fz") {
    const { data, count, error } = await base()
      .order("headword", { ascending: asc })
      .range(from, to);
    if (error) failed = true;
    const rows = data ?? [];
    const counts = await recordingCounts(supabase, rows.map((r: any) => r.id));
    entries = rows.map((r: any) => toCard(r, counts.get(r.id) ?? 0));
    total = count ?? 0;
  } else {
    const { data, error } = await base().range(0, SORT_CAP - 1);
    if (error) failed = true;
    const all = (data ?? []).map((r: any) => toCard(r));
    // Entries with no gloss sort last in both directions rather than flipping
    // to the top on Z–A, where they would be pure noise.
    const withGloss = all.filter((e) => e.gloss);
    const without = all.filter((e) => !e.gloss);
    withGloss.sort((a, b) => collator.compare(a.gloss ?? "", b.gloss ?? ""));
    if (!asc) withGloss.reverse();
    const ordered = [...withGloss, ...without];
    total = ordered.length;
    const pageRows = ordered.slice(from, from + PAGE_SIZE);
    // Only the 30 cards on screen need a count, not all 165 sorted rows.
    const counts = await recordingCounts(supabase, pageRows.map((r) => r.id));
    entries = pageRows.map((r) => ({
      ...r,
      recordings: (r.recordings ?? 0) + (counts.get(r.id) ?? 0),
    }));
  }

  /* What each filter would actually return. Without this, every chip looks
     alike and clicking "adverb" on a dictionary with no adverbs is a dead end
     with no warning. Same embed direction as the query above, so no new risk;
     if it comes back empty we simply do not dim anything. */
  const { data: tally } = await supabase
    .from("entries")
    .select("origin_area, senses(part_of_speech)")
    .eq("status", "approved")
    .range(0, SORT_CAP - 1);

  const posCounts = new Map<string, number>();
  const originCounts = new Map<string, number>();
  for (const row of (tally ?? []) as any[]) {
    if (row.origin_area) originCounts.set(row.origin_area, (originCounts.get(row.origin_area) ?? 0) + 1);
    // an entry counts once per part of speech, however many senses carry it
    const seen = new Set<string>();
    for (const s of row.senses ?? []) if (s?.part_of_speech) seen.add(s.part_of_speech);
    for (const p of seen) posCounts.set(p, (posCounts.get(p) ?? 0) + 1);
  }
  const countsKnown = (tally?.length ?? 0) > 0;

  /* One link builder for every chip and page link, so a sort survives a filter
     change and a filter survives a sort change. Any change resets to page 1. */
  const hrefWith = (over: Partial<Record<"pos" | "origin" | "sort" | "page", string>>) => {
    const next: Record<string, string> = {
      pos,
      origin,
      sort: sort === DEFAULT_SORT ? "" : sort,
      page: "",
      ...over,
    };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v));
    const s = qs.toString();
    return `/learn${s ? `?${s}` : ""}#words`;
  };

  const hasNext = from + PAGE_SIZE < total;
  // At least 1, so an empty filter never reads "page 1 of 0".
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const chip = (label: string, href: string, active: boolean, empty = false) => {
    const info = POS_NOTES[label];
    const tipId = info ? `tip-${label.replace(/\s+/g, "-")}` : undefined;
    return (
      <Link
        key={label}
        href={href}
        aria-current={active ? "true" : undefined}
        aria-describedby={tipId}
        title={empty ? `No ${label} in the dictionary yet` : undefined}
        className={
          "border px-2.5 py-1 text-[13px] transition-colors " +
          (info ? "has-info " : "") +
          (active
            ? "border-lacquer bg-lacquer text-paper"
            : "border-rule text-inkSoft hover:border-lacquer hover:text-lacquer") +
          // Chips that carry an explanation are never dimmed, entries or not —
          // the tooltip is the point of them, and a faded "i" reads as broken.
          (empty && !active && !info ? " opacity-40" : "")
        }
      >
        {label}
        {info && (
          <>
            <span className="info-dot" aria-hidden="true">
              i
            </span>
            <span id={tipId} role="tooltip" className="info-tip">
              {info}
            </span>
          </>
        )}
      </Link>
    );
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          Learn Fuzhounese
        </h1>
        {SHOW_GUIDE && (
          <>
            <p className="max-w-[68ch] text-[17px] leading-relaxed text-inkSoft">
              A dictionary can tell you what a word means. It cannot tell you that the word changes
              shape when you put another one after it, which in Fuzhounese it almost always does.
              This page is for that. Open whichever section you need.
            </p>
            <p className="max-w-[68ch] text-[17px] leading-relaxed text-inkSoft">
              Everything here is sourced, and the sources are listed at the bottom. Where something
              has not been confirmed by a speaker, it says so.
            </p>
          </>
        )}
      </section>

      {SHOW_GUIDE && <Contents />}

      {SHOW_GUIDE && <Guide />}

      {/* Features · Orthography · Further reading — one panel at a time,
          the first open on arrival. Content lives in panels.tsx. */}
      <LearnPanels panels={learnPanels} />

      <div
        id="words"
        className="flex scroll-mt-24 flex-wrap items-baseline justify-between gap-3 border-t border-rule pt-6"
      >
        <h2 className="font-display text-xl font-bold uppercase tracking-tight sm:text-2xl">
          All words
        </h2>
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          {total.toLocaleString()} {pos ? pos : "entr"}
          {pos ? (total === 1 ? "" : "s") : total === 1 ? "y" : "ies"}
          {origin ? ` from ${originArea(origin)!.label}` : ""}
        </span>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Part of speech</p>
        {/* relative: the info panels are positioned against this row, so they
            stay inside the content column however the chips wrap */}
        <div className="relative flex flex-wrap gap-2">
          {chip("All", hrefWith({ pos: "" }), !pos)}
          {PARTS_OF_SPEECH.map((p) =>
            chip(p, hrefWith({ pos: p }), pos === p, countsKnown && !posCounts.get(p))
          )}
        </div>

        {/* Collapsible, open by default — the same <details> idiom as the guide
            sections, so it needs no JavaScript. A chosen origin still shows in
            the count line above even when this is folded away. */}
        <details open className="group pt-2">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint marker:content-none hover:text-lacquer">
            Origin
            <span
              aria-hidden
              className="text-[10px] transition-transform group-open:rotate-90"
            >
              &#9656;
            </span>
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {chip("Anywhere", hrefWith({ origin: "" }), !origin)}
            {ORIGIN_GROUPS.flatMap((g) =>
              ORIGIN_AREAS.filter((a) => a.group === g).map((a) =>
                chip(
                  `${a.label} ${a.hanzi}`,
                  hrefWith({ origin: a.code }),
                  origin === a.code,
                  countsKnown && !originCounts.get(a.code)
                )
              )
            )}
          </div>
        </details>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Sort</p>
          {SORT_KEYS.map((k) => chip(SORTS[k].label, hrefWith({ sort: k }), sort === k))}
        </div>
        <p className="text-sm text-inkFaint">Click any word for the full entry.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
        {failed && (
          <p className="border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft sm:col-span-2">
            The word list is unavailable at the moment. Please check back shortly.
          </p>
        )}
        {!failed && entries.length === 0 && (
          <p className="text-inkSoft sm:col-span-2">
            {origin
              ? `Nothing recorded from ${originArea(origin)!.label} yet.`
              : pos
                ? `No ${pos}s yet.`
                : "No approved words yet. Be the first to add one."}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-5 font-mono text-xs uppercase tracking-[0.1em]">
        {page > 1 ? (
          <Link
            href={hrefWith({ page: page - 1 > 1 ? String(page - 1) : "" })}
            className="text-inkSoft hover:text-lacquer"
          >
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        <span className="text-inkFaint">
          Page {page} of {totalPages}
        </span>
        {hasNext ? (
          <Link href={hrefWith({ page: String(page + 1) })} className="text-inkSoft hover:text-lacquer">
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>

      {SHOW_GUIDE && <Sources />}
    </div>
  );
}

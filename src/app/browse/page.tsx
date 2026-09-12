import Link from "next/link";
import { redirect } from "next/navigation";
import EntryCard, { type CardProps } from "@/components/EntryCard";
import SearchBar from "@/components/SearchBar";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PARTS_OF_SPEECH } from "@/lib/constants";
import { one, toCards } from "@/lib/entries";
import { filterTally, hasUpdatedAt } from "@/lib/public-stats";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { getSafe } from "@/lib/safe";
import { withoutExplicit } from "@/lib/content-filter";
import { ORIGIN_AREAS, originArea } from "@/lib/origins";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;


/* ---------------------------------------------------------------------------
   Sorting.

   Fuzhounese sorts run in the database on entries.headword. English sorts
   run there too, from the other side: PostgREST will not order a parent by
   a child column, so the query starts from `senses` — each entry's FIRST
   sense (sort = 0), ordered by its definition, with the entry embedded — and
   pages that. Every entry has a first sense at 0 (the submit RPC, the
   importer and the editor all number from 0), so nothing is lost.

   Date sorts use entries.created_at and entries.updated_at (the latter kept
   by triggers in supabase/updated_at.sql). The key (what to sort by) and the
   direction are separate: `?sort=` picks the key and `?dir=` flips it, and
   one chip shows the current order and reverses it when clicked. Each key
   has its own natural direction — A–Z for text, newest first for dates —
   which is what you get on choosing it.
   --------------------------------------------------------------------------- */
const SORTS = {
  fz: { label: "Fuzhounese", kind: "text", column: "headword", natural: "asc" },
  en: { label: "English", kind: "text", column: "definition_en", natural: "asc" },
  added: { label: "Date added", kind: "date", column: "created_at", natural: "desc" },
  edited: { label: "Date edited", kind: "date", column: "updated_at", natural: "desc" },
} as const;

type SortKey = keyof typeof SORTS;
type Dir = "asc" | "desc";
const DEFAULT_SORT: SortKey = "fz";
const SORT_KEYS = Object.keys(SORTS) as SortKey[];

/* The direction chip's wording. Text sorts read as letters, date sorts as
   time, so "reverse" means something a reader can picture in both. */
function dirLabel(kind: "text" | "date", dir: Dir) {
  if (kind === "text") return dir === "asc" ? "A–Z" : "Z–A";
  return dir === "desc" ? "Newest first" : "Oldest first";
}

/* Links from before 2026-09-09 carried the key and direction in one word
   ("fz-za", "en-az"). They still work. */
const LEGACY_SORT: Record<string, [SortKey, Dir]> = {
  "fz-az": ["fz", "asc"], "fz-za": ["fz", "desc"], "en-az": ["en", "asc"], "en-za": ["en", "desc"],
};


/* Two of the parts of speech mean nothing to most English speakers, and they
   are exactly the ones a Fuzhounese learner most needs explained. Each gets a
   hover note on its filter chip. Grounded in the words the dictionary holds
   once scripts/new-entries.csv is imported: the particles 賣, 各, 未 and the
   measure words 隻, 本, 張, 條, 把, 間, 架. */
const POS_NOTES: Record<string, string> = {
  particle:
    "A short word that carries no meaning on its own but does grammatical work\u2014turning a statement into a question, marking a plural, or showing that something has already happened.",
  "measure word":
    "A counting word that goes between a number and a noun, like the \u201csheets\u201d in \u201cthree sheets of paper\u201d. Fuzhounese needs one, and which word you use depends on the kind of thing being counted.",
};

/* The chips read as one alphabetical run in both rows. The parts of speech
   were in a grammar book's order and the origins in geographical groups, but
   the groups are not shown on the chips, so the order only ever looked
   arbitrary to someone hunting for one. Two are pinned ahead of the A–Z:
   "Anywhere", which clears the filter, and Fuzhou city itself, which is what
   most people are looking for. */
const POS_CHIPS = [...PARTS_OF_SPEECH].sort((a, b) => a.localeCompare(b, "en"));
const PINNED_ORIGIN = "fuzhou_unsure";
const ORIGIN_CHIPS = [
  ...ORIGIN_AREAS.filter((a) => a.code === PINNED_ORIGIN),
  ...ORIGIN_AREAS.filter((a) => a.code !== PINNED_ORIGIN).sort((a, b) => a.label.localeCompare(b.label, "en")),
];

export const metadata: Metadata = {
  title: "Browse all words",
  description:
    "Every word in the Fuzhounese-English Dictionary, A to Z or by date, filtered by part of speech and by where in the Fuzhou region it is from.",
  alternates: { canonical: "/browse" },
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { page?: string; pos?: string; origin?: string; sort?: string; dir?: string };
}) {
  const t = translator(getLang());
  const safe = getSafe();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const posParam = (searchParams.pos ?? "").trim();
  const pos = (PARTS_OF_SPEECH as readonly string[]).includes(posParam) ? posParam : "";

  const originParam = (searchParams.origin ?? "").trim();
  const origin = originArea(originParam) ? originParam : "";

  /* "Date edited" needs entries.updated_at, which supabase/updated_at.sql
     adds. Until that has been run the column is not there, so the chip is
     left out and a link that names it falls back to "date added" — better
     than a word list that reads as unavailable. */
  const canSortEdited = await hasUpdatedAt();
  const sortKeys = SORT_KEYS.filter((k) => k !== "edited" || canSortEdited);

  const sortParam = (searchParams.sort ?? "").trim();
  const legacy = LEGACY_SORT[sortParam];
  const wanted: SortKey = legacy
    ? legacy[0]
    : SORT_KEYS.includes(sortParam as SortKey)
      ? (sortParam as SortKey)
      : DEFAULT_SORT;
  const sort: SortKey = wanted === "edited" && !canSortEdited ? "added" : wanted;
  const { kind, column, natural } = SORTS[sort];
  const dirParam = (searchParams.dir ?? "").trim();
  const dir: Dir = legacy ? legacy[1] : dirParam === "asc" || dirParam === "desc" ? dirParam : natural;
  const asc = dir === "asc";
  const lang = sort === "en" ? "en" : "fz";

  const supabase = createClient();
  // For the assistant's sign-in gate under the search box; cache() shares
  // the lookup with the header, so this costs nothing extra.
  const { user } = await getSessionUser();
  const senseCols = "definition_en, part_of_speech, sort";
  /* An inner join whenever a filter reaches into the meanings: PostgREST only
     drops the parent row when the embed is inner, so with a plain join a
     filtered-out meaning would leave the word behind with an empty senses
     array. */
  const joinSenses = Boolean(pos) || safe;
  const cols = `id, hanzi, romanization, headword, audio_url, senses${joinSenses ? "!inner" : ""}(${senseCols})`;

  const base = (head = false) => {
    let q = supabase.from("entries").select(cols, { count: "exact", head }).eq("status", "approved");
    if (pos) q = q.eq("senses.part_of_speech", pos);
    if (origin) q = q.eq("origin_area", origin);
    // A word whose only meaning is explicit disappears; one that also means
    // something else stays, showing the other meaning.
    if (safe) q = withoutExplicit(q, "senses.definition_en");
    return q;
  };

  let entries: CardProps[] = [];
  let total = 0;
  // A failed query must not read as "no words yet" — that is a lie with a
  // call to action attached. Tracked and rendered as an unavailable panel.
  let failed = false;

  /* The word list and the filter-chip tally are independent, so they are
     requested together rather than one after the other. */
  const englishQuery = () => {
    let q = supabase
      .from("senses")
      .select("definition_en, part_of_speech, entry:entries!inner(id, hanzi, romanization, headword, audio_url, origin_area)", { count: "exact" })
      .eq("entry.status", "approved");
    /* Which meaning stands for the word here. With no part-of-speech filter
       it is the first one, so the list is one row per word. With a filter it
       has to be the meaning that matched: 小時 carries "measure word" on its
       third meaning, and asking for the first as well quietly lost it — three
       words in the Fuzhounese order, two in the English one. */
    if (pos) q = q.eq("part_of_speech", pos);
    else q = q.eq("sort", 0);
    if (origin) q = q.eq("entry.origin_area", origin);
    if (safe) q = withoutExplicit(q, "definition_en");
    // Entries with no gloss sort last in both directions rather than flipping
    // to the top on Z–A, where they would be pure noise.
    return q.order("definition_en", { ascending: asc, nullsFirst: false }).range(from, to);
  };
  // Date sorts tie-break on headword so a batch imported in one second still
  // has a stable order across pages.
  const listQuery =
    lang === "fz"
      ? base().order(column, { ascending: asc }).order("headword", { ascending: true }).range(from, to)
      : englishQuery();

  /* What each filter would actually return. Without this, every chip looks
     alike and clicking "adverb" on a dictionary with no adverbs is a dead end
     with no warning. Cached for a minute across visitors (lib/public-stats);
     if it is unavailable we simply do not dim anything. */
  /* In English order the rows come from `senses`, so its count is meanings,
     not words. The number on screen and the paging are words, so they come
     from the same entries query the Fuzhounese order pages — one HEAD, no
     rows, alongside the others. */
  const [list, tally, entryCount] = await Promise.all([
    listQuery,
    filterTally(),
    lang === "en" ? base(true) : Promise.resolve(null),
  ]);

  if (lang === "fz") {
    const { data, count, error } = list;
    if (error) failed = true;
    entries = await toCards(supabase, data ?? []);
    total = count ?? 0;
  } else {
    const { data, error } = list;
    if (error) failed = true;
    // Turn each matching-sense row back into the entry shape the cards expect.
    // A word with two meanings of the same part of speech would arrive twice;
    // the first — the one the sort put here — is the one that is kept.
    const seen = new Set<string>();
    const rows = ((data ?? []) as any[])
      .map((r) => ({ ...one<any>(r.entry), senses: [{ definition_en: r.definition_en, part_of_speech: r.part_of_speech, sort: 0 }] }))
      .filter((e) => e.id && !seen.has(e.id) && seen.add(e.id));
    entries = await toCards(supabase, rows);
    total = (entryCount as any)?.count ?? 0;
  }

  const posCounts = new Map(Object.entries(tally.pos));
  const originCounts = new Map(Object.entries(tally.origin));
  const countsKnown = tally.known;

  /* One link builder for every chip and page link, so a sort survives a filter
     change and a filter survives a sort change. Any change resets to page 1. */
  const hrefWith = (over: Partial<Record<"pos" | "origin" | "sort" | "dir" | "page", string>>) => {
    const next: Record<string, string> = {
      pos,
      origin,
      sort: sort === DEFAULT_SORT ? "" : sort,
      dir: dir === natural ? "" : dir,
      page: "",
      ...over,
    };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v));
    const s = qs.toString();
    return `/browse${s ? `?${s}` : ""}#words`;
  };

  const hasNext = from + PAGE_SIZE < total;
  // At least 1, so an empty filter never reads "page 1 of 0".
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A typed page past the end lands on the last page rather than an empty one.
  if (!failed && page > totalPages) {
    redirect(hrefWith({ page: totalPages > 1 ? String(totalPages) : "" }));
  }

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
          "chip " +
          (info ? "has-info " : "") +
          (active ? "chip-on" : "") +
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

  /* "3,748 entries", "1 noun", "412 entries from Changle" — what the filters
     on screen would return, in the reader's language. */
  const countLine = [
    pos
      ? t(total === 1 ? "browse.count.pos.one" : "browse.count.pos", { n: total.toLocaleString(), pos })
      : t(total === 1 ? "browse.count.one" : "browse.count", { n: total.toLocaleString() }),
    origin ? t("browse.from", { place: originArea(origin)!.label }) : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="-my-10">
      {/* Hero, in the same shape as Learn, Contribute and About. */}
      <section className="pb-12 pt-20 max-[760px]:pb-8 max-[760px]:pt-11">
        <p className="eyebrow">{t("nav.browse")}</p>
        <h1 className="display mt-2">{t("browse.h")}</h1>
        <p className="lede read mt-6">{t("browse.lede")}</p>
      </section>
      <hr className="rule-bleed" />

      <div
        id="words"
        /* scroll-mt: how far below the top of the window the list lands when
           the page-jump form targets #words. */
        className="scroll-mt-3 space-y-8 py-12 max-[760px]:py-8"
      >
      {/* The same search as the home page, here because this is where people
          arrive looking for a word. It submits to the home page's results. */}
      <SearchBar focus={false} id="browse-search" signedIn={Boolean(user)} />

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Part of speech</p>
        {/* relative: the info panels are positioned against this row, so they
            stay inside the content column however the chips wrap */}
        <div className="relative flex flex-wrap gap-2">
          {chip("All", hrefWith({ pos: "" }), !pos)}
          {POS_CHIPS.map((p) =>
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
            {ORIGIN_CHIPS.map((a) =>
              chip(
                `${a.label} ${a.hanzi}`,
                hrefWith({ origin: a.code }),
                origin === a.code,
                countsKnown && !originCounts.get(a.code)
              )
            )}
          </div>
        </details>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Sort</p>
          {/* Choosing a key resets the direction to that key's natural one. */}
          {sortKeys.map((k) => chip(SORTS[k].label, hrefWith({ sort: k, dir: "" }), sort === k))}
          {/* One chip for the order. It names the current order and flips it
              when clicked, so there is never a second, near-identical chip. */}
          <Link
            href={hrefWith({ dir: asc ? "desc" : "asc" })}
            aria-label={`Order: ${dirLabel(kind, dir)}. Reverse to ${dirLabel(kind, asc ? "desc" : "asc")}`}
            title="Reverse the order"
            // Not a chip: it is an action, not a filter, so it reads as a
            // link — bold, underlined, the arrows in red.
            className="ml-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink underline decoration-ruleStrong decoration-[1.5px] underline-offset-[5px] transition-colors hover:decoration-lacquer"
          >
            <span aria-hidden className="font-mono text-[13px] leading-none text-lacquer">&#8645;</span>
            {dirLabel(kind, dir)}
          </Link>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">{countLine}</p>
      </div>

      {/* Three columns on a laptop, two on a tablet, one on a phone. The gaps
          are one pixel of the rule colour, so faint lines separate the cards
          both ways; the cards paint their own white over the rest. */}
      <div className="grid gap-px border-y border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
        {failed && (
          <p className="bg-paper p-5 text-sm text-inkSoft sm:col-span-2 lg:col-span-3">
            The word list is unavailable at the moment. Please check back shortly.
          </p>
        )}
        {!failed && entries.length === 0 && (
          <p className="bg-paper p-5 text-inkSoft sm:col-span-2 lg:col-span-3">
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
        {/* "Page 3 of 12", where the 3 is a box you can type into. A plain GET
            form, so it needs no JavaScript: the current filters ride along as
            hidden fields, the fragment on the action keeps the scroll at the
            list, and the server clamps whatever number arrives. With only one
            page there is nothing to jump to, so it is plain text. */}
        {totalPages > 1 ? (
          <form action="/browse#words" method="get" className="flex items-center gap-1.5 text-inkFaint">
            {pos && <input type="hidden" name="pos" value={pos} />}
            {origin && <input type="hidden" name="origin" value={origin} />}
            {sort !== DEFAULT_SORT && <input type="hidden" name="sort" value={sort} />}
            {dir !== natural && <input type="hidden" name="dir" value={dir} />}
            <label htmlFor="page-jump">Page</label>
            <input
              id="page-jump"
              name="page"
              type="number"
              inputMode="numeric"
              min={1}
              max={totalPages}
              defaultValue={page}
              aria-label={`Page number, 1 to ${totalPages}`}
              className="w-12 border border-rule bg-surface px-1.5 py-0.5 text-center font-mono text-xs tabular-nums text-ink outline-none focus:border-lacquer [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span>of {totalPages}</span>
            <button
              type="submit"
              className="ml-1 border border-rule px-2 py-0.5 text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer"
            >
              Go
            </button>
          </form>
        ) : (
          <span className="text-inkFaint">Page 1 of 1</span>
        )}
        {hasNext ? (
          <Link href={hrefWith({ page: String(page + 1) })} className="text-inkSoft hover:text-lacquer">
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>
      </div>
    </div>
  );
}

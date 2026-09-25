import Link from "next/link";
import { recordingsTrusted } from "@/lib/trust";
import QuickRecord from "@/components/QuickRecord";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInGate from "@/components/SignInGate";
import ContributeTabs from "@/components/ContributeTabs";
import Recorder from "@/components/Recorder";
import SavedNotice from "@/components/SavedNotice";
import SuggestBox, { type SenseOption } from "@/components/SuggestBox";
import { formatOrigin, originArea, ORIGIN_AREAS } from "@/lib/origins";
import FilterPanel from "@/components/FilterPanel";
import { MAX_RECORDINGS_PER_WORD, PARTS_OF_SPEECH } from "@/lib/constants";
import { sortSenses } from "@/lib/entries";
import { missionTally } from "@/lib/public-stats";
import { getLang } from "@/lib/lang";
import { pick, type Pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Improve the dictionary",
  description:
    "Every word in the Fuzhounese Dictionary that is still missing something—a recording, IPA, an example sentence—so you can work straight down the list.",
  alternates: { canonical: "/improve" },
};

const PAGE_SIZE = 25;

/* Sorting, as on Browse: a key and a direction, one chip per key and one
   link that names the order and reverses it. "Most requested" leads and is
   the default here — the words people are waiting for — then the Browse
   page's three: Fuzhounese and English A–Z, and date added. */
const SORTS = {
  wanted: { en: "Most requested", zh: "最多人想要", kind: "count", column: "votes", natural: "desc" },
  fz: { en: "Fuzhounese", zh: "福州話", kind: "text", column: "headword", natural: "asc" },
  en: { en: "English", zh: "英文", kind: "text", column: "short_gloss", natural: "asc" },
  added: { en: "Date added", zh: "加入日期", kind: "date", column: "created_at", natural: "desc" },
} as const;
type SortKey = keyof typeof SORTS;
type Dir = "asc" | "desc";
const DEFAULT_SORT: SortKey = "wanted";
const SORT_KEYS = Object.keys(SORTS) as SortKey[];

/* The Browse page's two filters, in the Browse page's order: parts of speech
   A–Z, and places with Fuzhou city pinned first, the rest A–Z. */
const POS_CHIPS = [...PARTS_OF_SPEECH].sort((a, b) => a.localeCompare(b, "en"));
/* Display names for the part-of-speech chips; the URL keeps the English value. */
const POS_ZH: Record<string, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  pronoun: "代詞",
  numeral: "數詞",
  "measure word": "量詞",
  particle: "助詞",
  phrase: "片語",
  "proper noun": "專有名詞",
};
const posLabel = (L: Pick, p: string) => L(p, POS_ZH[p] ?? p);

/* Quick record's batch (Noah, 23 Sep 2026: the next word should be random,
   not the next one alphabetically). A run of QUICK_BATCH words from a random
   point in the whole list of words needing a recording (same filters), put
   in a shuffled order. The starting point travels in the address (?qo=), and
   the shuffle is seeded by it, so a reload, or the refresh after a save,
   keeps the same batch in the same order. After the last word, a new random
   starting point. */
const QUICK_BATCH = 25;
function seededShuffle<T>(items: T[], seed: number): T[] {
  // mulberry32
  let a = (seed * 2654435761 + 1) >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const randomOffset = (total: number) => Math.floor(Math.random() * Math.max(1, total - QUICK_BATCH + 1));
const PINNED_ORIGIN = "fuzhou_unsure";
const ORIGIN_CHIPS = [
  ...ORIGIN_AREAS.filter((a) => a.code === PINNED_ORIGIN),
  ...ORIGIN_AREAS.filter((a) => a.code !== PINNED_ORIGIN).sort((a, b) => a.label.localeCompare(b.label, "en")),
];

/* One screen, one list, fix-and-move-on. A speaker with twenty minutes should
   get through twenty words without ever navigating between entries.
   Everything sent from here waits for an editor: see supabase/suggestions.sql. */

export default async function ImprovePage({
  searchParams,
}: {
  searchParams: { page?: string; origin?: string; need?: string; pos?: string; sort?: string; dir?: string; sent?: string; problem?: string; n?: string; qo?: string };
}) {
  const { user, profile } = await getSessionUser();
  const L = pick(getLang());

  if (!user) {
    const recording = searchParams.need === "recording";
    const tally = recording ? await missionTally().catch(() => null) : null;
    const silent = tally ? Math.max(0, tally.words - tally.voiced) : null;
    return (
      <div className="space-y-8">
        <ContributeTabs active={recording ? "record" : "improve"} />
        <SignInGate
          kind={recording ? "record" : "improve"}
          title={recording ? L("Sign in to record a word", "登入後錄一個詞") : L("Sign in to improve a word", "登入後完善詞條")}
          text={
            recording
              ? L(
                  "Pick a word that has no recording yet and say it into your phone or laptop. One take is enough, and where your Fuzhounese is from is saved with it.",
                  "挑一個還沒有錄音的詞，對著手機或電腦講出來，錄一次就好。你的福州話來自哪裡也會一併記下。"
                )
              : L(
                  "Fill in what a word is missing: its pronunciation in IPA, or an example sentence. An editor reads it before it appears, and it is credited to you.",
                  "替詞條補上缺少的資料：IPA 發音或例句。經編輯審閱後才會刊出，並記在你的名下。"
                )
          }
          next={recording ? "/improve?need=recording" : "/improve"}
        />
        {/* How much there is to do: the number from the same tally the home
            page uses, so the two never disagree. */}
        {recording && silent !== null && silent > 0 && (
          <p className="max-w-2xl text-inkSoft">
            <span className="h2 mr-2 align-baseline tabular-nums text-lacquer">{silent.toLocaleString()}</span>
            {silent === 1
              ? L("word in the dictionary still has no recording.", "個詞還沒有錄音。")
              : L("words in the dictionary still have no recording.", "個詞還沒有錄音。")}
          </p>
        )}
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const originParam = (searchParams.origin ?? "").trim();
  const origin = originArea(originParam) ? originParam : "";
  // ?need=recording narrows the list to one kind of gap — the Contribute
  // hub's "Record a word" lands here with only the silent words showing.
  const need = (["recording", "ipa", "example"] as const).find((k) => k === searchParams.need) ?? "";
  const pos = (PARTS_OF_SPEECH as readonly string[]).includes(searchParams.pos ?? "") ? (searchParams.pos as string) : "";
  const sort: SortKey = (SORT_KEYS as string[]).includes(searchParams.sort ?? "") ? (searchParams.sort as SortKey) : DEFAULT_SORT;
  const { kind: sortKind, column: sortColumn, natural } = SORTS[sort];
  const dir: Dir = searchParams.dir === "asc" || searchParams.dir === "desc" ? searchParams.dir : natural;
  const asc = dir === "asc";
  const dirLabel = (d: Dir) =>
    sortKind === "text"
      ? d === "asc" ? "A–Z" : "Z–A"
      : sortKind === "date"
        ? d === "desc" ? L("Newest first", "最新的在前") : L("Oldest first", "最舊的在前")
        : d === "desc" ? L("Most first", "最多的在前") : L("Fewest first", "最少的在前");

  const supabase = createClient();
  let query = supabase
    .from("needs_work")
    .select(
      // With a part of speech chosen, an inner join to the meanings keeps
      // only the words with a meaning of that kind (PostgREST embeds through
      // the view to entries' senses).
      `id, headword, hanzi, romanization, short_gloss, origin_area, origin_locality, votes, needs_recording, needs_ipa, needs_example${pos ? ", senses!inner(part_of_speech)" : ""}`,
      { count: "exact" }
    )
    .or("needs_recording.eq.true,needs_ipa.eq.true,needs_example.eq.true");
  if (origin) query = query.eq("origin_area", origin);
  if (need) query = query.eq(`needs_${need}`, true);
  if (pos) query = query.eq("senses.part_of_speech", pos);

  const { data, count, error } = await query
    .order(sortColumn, { ascending: asc, nullsFirst: false })
    // Ties (equal votes, the same day) fall back to A–Z.
    .order("headword", { ascending: true })
    .range(from, to);

  const rows = data ?? [];
  const total = count ?? 0;
  const hasNext = to + 1 < total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A typed page past the end lands on the last page rather than an empty one.
  if (!error && page > totalPages) {
    redirect(`/improve?${new URLSearchParams({ ...(origin ? { origin } : {}), ...(need ? { need } : {}), ...(pos ? { pos } : {}), ...(sort !== DEFAULT_SORT ? { sort } : {}), ...(dir !== natural ? { dir } : {}), ...(totalPages > 1 ? { page: String(totalPages) } : {}) })}#worklist`);
  }

  const ids = rows.map((r: any) => r.id);

  /* Quick record's own batch, independent of the list's sort and page. Drawn
     from every word in the dictionary, recorded or not (Noah, 23 Sep 2026):
     a word with a recording still wants yours, in your own variety. The
     same filters as the list. */
  let quickRows: any[] = [];
  let quickOffset = 0;
  let quickTotal = 0;
  if (need === "recording" && !error) {
    const quickQuery = (opts?: { count: "exact"; head: true }) => {
      let q = supabase
        .from("needs_work")
        .select(`id, headword, hanzi, romanization, short_gloss, needs_recording${pos ? ", senses!inner(part_of_speech)" : ""}`, opts);
      if (origin) q = q.eq("origin_area", origin);
      if (pos) q = q.eq("senses.part_of_speech", pos);
      return q;
    };
    const { count: qc } = await quickQuery({ count: "exact", head: true });
    quickTotal = qc ?? 0;
    const asked = parseInt(searchParams.qo ?? "", 10);
    quickOffset = Number.isFinite(asked) && asked >= 0 && asked < quickTotal ? asked : randomOffset(quickTotal);
    const { data: qd } = await quickQuery()
      .order("headword", { ascending: true })
      .range(quickOffset, quickOffset + QUICK_BATCH - 1);
    quickRows = seededShuffle((qd ?? []) as any[], quickOffset);
  }
  const allIds = [...new Set([...ids, ...quickRows.map((r) => r.id)])];

  // The senses of the words on this page, so an example can say which meaning
  // it belongs to. Only fetched for the 25 rows on screen.
  const senses: Record<string, SenseOption[]> = {};
  // What this user already has in the queue, so we show "awaiting review"
  // instead of inviting them to send the same thing again. RLS means this only
  // ever returns their own rows.
  const mine: Record<string, { ipa: boolean; example: boolean }> = {};
  // How many takes this user already has on each word (not counting rejected
  // ones), so the record button disappears at the two-per-word cap instead of
  // inviting a recording the database would refuse.
  const takes: Record<string, number> = {};

  if (allIds.length) {
    const [{ data: senseRows }, { data: pendingRows }, { data: takeRows }] = await Promise.all([
      supabase.from("senses").select("id, entry_id, definition_en, sort").in("entry_id", allIds),
      supabase
        .from("suggestions")
        .select("entry_id, kind")
        .eq("contributor_id", user.id)
        .eq("status", "pending")
        .in("entry_id", ids),
      supabase
        .from("recordings")
        .select("entry_id")
        .eq("contributor_id", user.id)
        .neq("status", "rejected")
        .in("entry_id", allIds),
    ]);
    for (const t of (takeRows ?? []) as any[]) takes[t.entry_id] = (takes[t.entry_id] ?? 0) + 1;

    // Same order as the meanings on the entry page, so "which meaning" in the
    // example form matches what the person sees there.
    for (const s of sortSenses<any>(senseRows)) {
      (senses[s.entry_id] ??= []).push({ id: s.id, definition_en: s.definition_en });
    }
    for (const s of (pendingRows ?? []) as any[]) {
      mine[s.entry_id] ??= { ipa: false, example: false };
      if (s.kind === "ipa") mine[s.entry_id].ipa = true;
      if (s.kind === "example") mine[s.entry_id].example = true;
    }
  }

  // Every link keeps the filters and the order; a sort left at its default
  // stays out of the address.
  const href = (o: string, p = 1, n: string = need, ps: string = pos, so: SortKey = sort, d: Dir | "" = dir) => {
    const nat = SORTS[so].natural;
    return `/improve?${new URLSearchParams({ ...(o ? { origin: o } : {}), ...(n ? { need: n } : {}), ...(ps ? { pos: ps } : {}), ...(so !== DEFAULT_SORT ? { sort: so } : {}), ...(d && d !== nat ? { dir: d } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  };

  /* One folding filter row, the same <details> as on Browse. Folded unless
     `open`, or unless something in it is chosen, so a filter in use is
     never hidden. */
  const filterGroup = (label: string, open: boolean, chips: React.ReactNode) => (
    <details open={open || (label === L("Part of speech", "詞性") ? !!pos : !!origin)} className="group/f pt-2 first:pt-0">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 meta text-inkFaint marker:content-none hover:text-lacquer [&::-webkit-details-marker]:hidden">
        {label}
        <span aria-hidden className="text-[10px] transition-transform group-open/f:rotate-90">
          &#9656;
        </span>
      </summary>
      <div className="mt-2 flex flex-wrap gap-2">{chips}</div>
    </details>
  );

  const chip = (label: string, to: string, active: boolean) => (
    <Link key={label} href={to} aria-current={active ? "true" : undefined} className={"chip" + (active ? " chip-on" : "")}>
      {label}
    </Link>
  );

  /* Quick record: one word at a time, big, with the recorder under it and a
     "Next word" that moves along — so a speaker can say ten words in a row
     without scanning the list. It walks the batch drawn above, leaving out
     the words this person has already recorded to the cap. */
  const recordable = quickRows.filter((r) => (takes[r.id] ?? 0) < MAX_RECORDINGS_PER_WORD);
  const quickHere = (o: number) => {
    const h = href(origin, page);
    return `${h}${h.endsWith("?") ? "" : "&"}qo=${o}`;
  };
  const n = Math.max(0, parseInt(searchParams.n ?? "0", 10) || 0);

  const sentLabel =
    searchParams.sent === "ipa"
      ? L("IPA sent for review", "IPA 已送交審核")
      : searchParams.sent === "example"
        ? L("Example sent for review", "例句已送交審核")
        : null;

  return (
    <div className="space-y-8">
      <ContributeTabs active={need === "recording" ? "record" : "improve"} />
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="max-w-[60ch] text-[17px] leading-relaxed text-inkSoft">
            {need === "recording" ? (
              <>
                {recordingsTrusted()
                  ? L(
                      "None of the words listed here has a recording yet. Press the button beside one and say it. Your recording goes live straight away, and an editor listens to it afterwards.",
                      "這裡列出的詞都還沒有錄音。按下旁邊的按鈕，講出來。錄音會直接上線，之後由編輯再聽一次。"
                    )
                  : L(
                      "None of the words listed here has a recording yet. Press the button beside one, say it, and an editor will check it before it appears.",
                      "這裡列出的詞都還沒有錄音。按下旁邊的按鈕，講出來，經編輯審過後就會刊出。"
                    )}
              </>
            ) : (
              <>
                {recordingsTrusted()
                  ? L(
                      "Each word listed here is missing something. Fill in what you can—a recording, the pronunciation, a sentence. Recordings go live straight away and are checked afterwards; an editor checks the rest before it appears.",
                      "這裡列出的每個詞都缺了點什麼。能補多少就補多少——錄音、發音、例句。錄音會直接上線，之後再審；其他內容經編輯審過後才會刊出。"
                    )
                  : L(
                      "Each word listed here is missing something. Fill in what you can—a recording, the pronunciation, a sentence—and an editor will check it before it appears.",
                      "這裡列出的每個詞都缺了點什麼。能補多少就補多少——錄音、發音、例句——經編輯審過後就會刊出。"
                    )}
              </>
            )}
            {L(" Words people are waiting for are under ", "有人在等的詞，列在")}
            <Link href="/request" className="text-lacquer hover:underline">{L("Request a word", "請求詞條")}</Link>
            {L(".", "。")}
          </p>
          {!error && (
            <span className="meta text-inkFaint">
              {L(
                `{n} word${total === 1 ? "" : "s"} ${need === "recording" ? "without a recording" : need ? "missing this" : `need${total === 1 ? "s" : ""} work`}`,
                need === "recording" ? "{n} 個詞還沒有錄音" : need ? "{n} 個詞缺少這一項" : "{n} 個詞有待完善",
                { n: total.toLocaleString() }
              )}
            </span>
          )}
        </div>
        <p className="max-w-[68ch] text-sm text-inkSoft">
          {L(
            "Your contributions are labeled with where your Fuzhounese is from, which you can set on ",
            "你的貢獻會標上你的福州話來自哪裡，可以在"
          )}
          <Link href="/account" className="whitespace-nowrap text-lacquer hover:underline">{L("your account page", "帳號頁面")}</Link>
          {L(".", "設定。")}
        </p>
      </section>

      {(sentLabel || searchParams.problem) && (
        <div className="rounded-sm flex flex-wrap items-center gap-3 border-l-2 border-lacquer bg-surface px-4 py-3">
          {sentLabel ? (
            <SavedNotice message={L("✓ {label}—thank you", "✓ {label}，謝謝你", { label: sentLabel })} />
          ) : (
            <p role="alert" className="text-sm text-inkSoft">
              {searchParams.problem}
            </p>
          )}
        </div>
      )}

      {/* Quick record comes before the filters and sort (Noah, 23 Sep
          2026), so it is the first thing a speaker reaches. */}
      {recordable.length > 0 && (
        <QuickRecord
          words={recordable.map((r: any) => ({
            id: r.id,
            hanzi: r.hanzi ?? null,
            romanization: r.romanization ?? null,
            headword: r.headword,
            gloss: r.short_gloss ?? null,
            senseId: senses[r.id]?.[0]?.id ?? null,
            recorded: !r.needs_recording,
          }))}
          start={n}
          batch={quickOffset}
          nextPage={`${quickHere(randomOffset(quickTotal))}#quick`}
          userId={user.id}
          isEditor={Boolean(profile?.is_editor)}
        />
      )}

      {/* The Browse page's filters. Record a word: both open, as on Browse,
          and no "Missing" row (everything here is missing a recording).
          Improve a word: the "Missing" row, part of speech open, and "Words
          from" folded away. */}
      <section className="space-y-5">
        {need !== "recording" && (
          <div className="space-y-2">
            <p className="eyebrow">{L("Missing", "缺少")}</p>
            <div className="flex flex-wrap gap-2">
              {chip(L("Anything", "不限"), href(origin, 1, ""), !need)}
              {chip(L("A recording", "錄音"), href(origin, 1, "recording"), false)}
              {chip(L("The pronunciation (IPA)", "發音（IPA）"), href(origin, 1, "ipa"), need === "ipa")}
              {chip(L("An example sentence", "例句"), href(origin, 1, "example"), need === "example")}
            </div>
          </div>
        )}
        <FilterPanel summary={[pos ? posLabel(L, pos) : "", origin ? originArea(origin)!.label : ""].filter(Boolean).join(" · ")}>
          <div className="space-y-2">
            {filterGroup(
              L("Part of speech", "詞性"),
              true,
              <>
                {chip(L("All", "全部"), href(origin, 1, need, ""), !pos)}
                {POS_CHIPS.map((p) => chip(posLabel(L, p), href(origin, 1, need, p), pos === p))}
              </>
            )}
            {filterGroup(
              L("Words from", "詞的來源"),
              need === "recording",
              <>
                {chip(L("Anywhere", "不限地區"), href("", 1), !origin)}
                {ORIGIN_CHIPS.map((a) => chip(`${a.label} ${a.hanzi}`, href(a.code, 1), origin === a.code))}
              </>
            )}
          </div>
        </FilterPanel>

        {/* Sort, as on Browse: the label on its own line, the keys on the
            next, and one link that names the order and flips it. */}
        <div>
          <p className="meta mb-2 text-inkFaint">{L("Sort", "排序")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {/* Choosing a key resets the direction to that key's natural one. */}
            {SORT_KEYS.map((k) => chip(L(SORTS[k].en, SORTS[k].zh), href(origin, 1, need, pos, k, ""), sort === k))}
            <Link
              href={href(origin, 1, need, pos, sort, asc ? "desc" : "asc")}
              aria-label={L("Order: {now}. Reverse to {then}", "順序：{now}。改為{then}", { now: dirLabel(dir), then: dirLabel(asc ? "desc" : "asc") })}
              title={L("Reverse the order", "反轉順序")}
              className="ml-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink underline decoration-ruleStrong decoration-[1.5px] underline-offset-[5px] transition-colors hover:decoration-lacquer"
            >
              <span aria-hidden className="text-[13px] leading-none text-lacquer">&#8645;</span>
              {dirLabel(dir)}
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-sm border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">
          {L("The worklist is unavailable at the moment. Please check back shortly.", "待補清單暫時無法使用，請稍後再試。")}
        </p>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-sm border border-rule bg-surface p-8">
          <p className="text-inkSoft">
            {origin
              ? L("Every word from {place} is complete.", "來自{zhPlace}的詞都已完整。", {
                  place: originArea(origin)!.label,
                  zhPlace: originArea(origin)!.hanzi,
                })
              : L("Every word in the dictionary is complete. Genuinely remarkable.", "辭典裡的每個詞都已完整。真的了不起。")}
          </p>
          <Link href="/learn" className="mt-2 inline-block font-medium text-lacquer hover:underline">
            {L("Browse the dictionary", "瀏覽辭典")}
          </Link>
        </div>
      )}

      <ol id="worklist" className="scroll-mt-3 divide-y divide-rule border-y border-rule">
        {rows.map((r: any, i: number) => {
          const wordOrigin = formatOrigin(r.origin_area, r.origin_locality);
          return (
            <li
              key={r.id}
              id={`w-${r.id}`}
              className="grid scroll-mt-24 gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs tabular-nums text-inkFaint">
                    {String(from + i + 1).padStart(2, "0")}
                  </span>
                  {r.hanzi && (
                    <Link
                      href={`/entry/${r.id}`}
                      className="font-display text-2xl font-bold leading-none hover:text-lacquer"
                    >
                      {r.hanzi}
                    </Link>
                  )}
                  <Link
                    href={`/entry/${r.id}`}
                    className="romanization font-display text-lg font-semibold text-lacquer hover:underline"
                  >
                    {r.romanization || r.headword}
                  </Link>
                  {wordOrigin && (
                    <span className="rounded-sm meta text-inkFaint ring-1 ring-rule px-2 py-0.5">
                      {wordOrigin}
                    </span>
                  )}
                  {r.votes > 0 && (
                    <span className="rounded-sm meta text-lacquer ring-1 ring-lacquer px-2 py-0.5">
                      {/* Upvotes on an open request for a recording of this
                          word (Noah, 23 Sep 2026: "1 asked" said too little). */}
                      {L(r.votes === 1 ? "1 person wants a recording" : "{n} people want a recording", "{n} 人想聽錄音", { n: r.votes })}
                    </span>
                  )}
                </div>

                {r.short_gloss && <p className="mt-1 text-inkSoft">{r.short_gloss}</p>}

                {(r.needs_ipa || r.needs_example) && (
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    {r.needs_ipa && (
                      <SuggestBox kind="ipa" entryId={r.id} pending={mine[r.id]?.ipa} page={page} origin={origin} need={need} />
                    )}
                    {r.needs_example && (senses[r.id]?.length ?? 0) > 0 && (
                      <SuggestBox
                        kind="example"
                        entryId={r.id}
                        senses={senses[r.id]}
                        pending={mine[r.id]?.example}
                        page={page}
                        origin={origin}
                        need={need}
                      />
                    )}
                  </div>
                )}
              </div>

              {r.needs_recording ? (
                (takes[r.id] ?? 0) >= MAX_RECORDINGS_PER_WORD ? (
                  <span className="meta text-inkFaint">
                    {L("you have recorded this twice", "你已錄過兩次")}
                  </span>
                ) : (
                  <Recorder userId={user.id} entryId={r.id} isEditor={Boolean(profile?.is_editor)} kind="headword" phraseSenseId={senses[r.id]?.[0]?.id} label={L("Needs a recording", "需要錄音")} />
                )
              ) : (
                <span className="meta text-inkFaint">
                  {L("has a recording", "已有錄音")}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-between meta">
          {page > 1 ? (
            <Link href={href(origin, page - 1)} className="text-inkSoft hover:text-lacquer">
              {L("← Previous", "← 上一頁")}
            </Link>
          ) : (
            <span />
          )}
          {/* "Page 3 of 12", where the 3 is a box you can type into. Same
              form as on /learn: plain GET, filters ride along as hidden
              fields, the fragment keeps the scroll at the list. */}
          <form action="/improve#worklist" method="get" className="flex items-center gap-1.5 text-inkFaint">
            {origin && <input type="hidden" name="origin" value={origin} />}
            {need && <input type="hidden" name="need" value={need} />}
            {pos && <input type="hidden" name="pos" value={pos} />}
            {sort !== DEFAULT_SORT && <input type="hidden" name="sort" value={sort} />}
            {dir !== natural && <input type="hidden" name="dir" value={dir} />}
            <label htmlFor="page-jump">{L("Page", "第")}</label>
            <input
              id="page-jump"
              name="page"
              type="number"
              inputMode="numeric"
              min={1}
              max={totalPages}
              defaultValue={page}
              aria-label={L("Page number, 1 to {n}", "頁碼，1 至 {n}", { n: totalPages })}
              className="rounded-sm w-12 border border-rule bg-surface px-1.5 py-0.5 text-center text-xs tabular-nums text-ink outline-none focus:border-lacquer [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span>{L("of {n}", "頁，共 {n} 頁", { n: totalPages })}</span>
            <button
              type="submit"
              className="rounded-sm ml-1 border border-rule px-2 py-0.5 text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer"
            >
              {L("Go", "前往")}
            </button>
          </form>
          {hasNext ? (
            <Link href={href(origin, page + 1)} className="text-inkSoft hover:text-lacquer">
              {L("Next {n} →", "下 {n} 個 →", { n: PAGE_SIZE })}
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

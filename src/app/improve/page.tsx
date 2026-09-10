import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import ContributeTabs from "@/components/ContributeTabs";
import Recorder from "@/components/Recorder";
import SavedNotice from "@/components/SavedNotice";
import SuggestBox, { type SenseOption } from "@/components/SuggestBox";
import { formatOrigin, ORIGIN_AREAS, ORIGIN_GROUPS, originArea } from "@/lib/origins";
import { MAX_RECORDINGS_PER_WORD } from "@/lib/constants";
import { sortSenses } from "@/lib/entries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Improve the dictionary",
  description:
    "Every word in the Fuzhounese Dictionary that is still missing something—a recording, IPA, an example sentence—so you can work straight down the list.",
  alternates: { canonical: "/improve" },
};

const PAGE_SIZE = 25;

/* One screen, one list, fix-and-move-on. A speaker with twenty minutes should
   get through twenty words without ever navigating between entries.
   Everything sent from here waits for an editor: see supabase/suggestions.sql. */

export default async function ImprovePage({
  searchParams,
}: {
  searchParams: { page?: string; origin?: string; need?: string; sent?: string; problem?: string };
}) {
  const { user } = await getSessionUser();

  if (!user) {
    const recording = searchParams.need === "recording";
    return (
      <div className="space-y-8">
        <ContributeTabs active="improve" />
        <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-rule bg-surface p-8 text-center">
          <p className="h3">{recording ? "Sign in to record a word" : "Sign in to improve a word"}</p>
          <p className="text-inkSoft">
            {recording
              ? "Pick a word that has no recording yet and say it into your phone or laptop. It takes about thirty seconds, and where your Fuzhounese is from is saved with it."
              : "This page is a list of every word still missing something—a recording, IPA, an example sentence—with a record button beside each one."}
          </p>
          <div className="flex justify-center">
            <SignInButton next={recording ? "/improve?need=recording" : "/improve"} label={translator(getLang())("signin.google")} />
          </div>
        </div>
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

  const supabase = createClient();
  let query = supabase
    .from("needs_work")
    .select(
      "id, headword, hanzi, romanization, short_gloss, origin_area, origin_locality, votes, needs_recording, needs_ipa, needs_example",
      { count: "exact" }
    )
    .or("needs_recording.eq.true,needs_ipa.eq.true,needs_example.eq.true");
  if (origin) query = query.eq("origin_area", origin);
  if (need) query = query.eq(`needs_${need}`, true);

  const { data, count, error } = await query
    .order("votes", { ascending: false })
    .order("headword", { ascending: true })
    .range(from, to);

  const rows = data ?? [];
  const total = count ?? 0;
  const hasNext = to + 1 < total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A typed page past the end lands on the last page rather than an empty one.
  if (!error && page > totalPages) {
    redirect(`/improve?${new URLSearchParams({ ...(origin ? { origin } : {}), ...(need ? { need } : {}), ...(totalPages > 1 ? { page: String(totalPages) } : {}) })}#worklist`);
  }

  const ids = rows.map((r: any) => r.id);

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

  if (ids.length) {
    const [{ data: senseRows }, { data: pendingRows }, { data: takeRows }] = await Promise.all([
      supabase.from("senses").select("id, entry_id, definition_en, sort").in("entry_id", ids),
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
        .in("entry_id", ids),
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

  const href = (o: string, p = 1, n: string = need) =>
    `/improve?${new URLSearchParams({ ...(o ? { origin: o } : {}), ...(n ? { need: n } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  const chip = (label: string, to: string, active: boolean) => (
    <Link key={label} href={to} aria-current={active ? "true" : undefined} className={"chip" + (active ? " chip-on" : "")}>
      {label}
    </Link>
  );

  const sentLabel =
    searchParams.sent === "ipa"
      ? "IPA sent for review"
      : searchParams.sent === "example"
        ? "Example sent for review"
        : null;

  return (
    <div className="space-y-8">
      <ContributeTabs active="improve" />
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="max-w-[60ch] text-[17px] leading-relaxed text-inkSoft">
            {need === "recording" ? (
              <>
                None of the words listed here has a recording yet. Press the button beside one and
                say it—about thirty seconds—and an editor will check it before it appears.
              </>
            ) : (
              <>
                Each word listed here is missing something. Fill in what you can—a recording, the
                pronunciation, a sentence—and an editor will check it before it appears.
              </>
            )}{" "}
            Words people are waiting for are under{" "}
            <Link href="/request" className="text-lacquer hover:underline">Wanted</Link>.
          </p>
          {!error && (
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
              {total.toLocaleString()} word{total === 1 ? "" : "s"}{" "}
              {need === "recording" ? "without a recording" : need ? "missing this" : `need${total === 1 ? "s" : ""} work`}
            </span>
          )}
        </div>
        <p className="max-w-[68ch] text-sm text-inkSoft">
          Your contributions are labeled with where your Fuzhounese is from, which you can set on{" "}
          <Link href="/account" className="whitespace-nowrap text-lacquer hover:underline">your account page</Link>.
        </p>
      </section>

      {(sentLabel || searchParams.problem) && (
        <div className="flex flex-wrap items-center gap-3 border-l-2 border-lacquer bg-surface px-4 py-3">
          {sentLabel ? (
            <SavedNotice message={`✓ ${sentLabel}—thank you`} />
          ) : (
            <p role="alert" className="text-sm text-inkSoft">
              {searchParams.problem}
            </p>
          )}
        </div>
      )}

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="eyebrow">Missing</p>
          <div className="flex flex-wrap gap-2">
            {chip("Anything", href(origin, 1, ""), !need)}
            {chip("A recording", href(origin, 1, "recording"), need === "recording")}
            {chip("The pronunciation (IPA)", href(origin, 1, "ipa"), need === "ipa")}
            {chip("An example sentence", href(origin, 1, "example"), need === "example")}
          </div>
        </div>
        <div className="space-y-2">
          <p className="eyebrow">Words from</p>
          <div className="flex flex-wrap gap-2">
            {chip("Anywhere", href(""), !origin)}
            {ORIGIN_GROUPS.flatMap((g) =>
              ORIGIN_AREAS.filter((a) => a.group === g).map((a) =>
                chip(`${a.label} ${a.hanzi}`, href(a.code), origin === a.code)
              )
            )}
          </div>
        </div>
      </section>

      {error && (
        <p className="border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">
          The worklist is unavailable at the moment. Please check back shortly.
        </p>
      )}

      {!error && rows.length === 0 && (
        <div className="border border-rule bg-surface p-8 text-center">
          <p className="text-inkSoft">
            {origin
              ? `Every word from ${originArea(origin)!.label} is complete.`
              : "Every word in the dictionary is complete. Genuinely remarkable."}
          </p>
          <Link href="/learn" className="mt-2 inline-block font-medium text-lacquer hover:underline">
            Browse the dictionary →
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
                  <span className="font-mono text-xs tabular-nums text-inkFaint">
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
                    <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint ring-1 ring-rule px-2 py-0.5">
                      {wordOrigin}
                    </span>
                  )}
                  {r.votes > 0 && (
                    <span className="font-mono text-[11px] uppercase tracking-wide text-lacquer ring-1 ring-lacquer px-2 py-0.5">
                      {r.votes} asked
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
                  <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">
                    you have recorded this twice
                  </span>
                ) : (
                  <Recorder userId={user.id} entryId={r.id} kind="headword" label="Needs a recording" />
                )
              ) : (
                <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">
                  has a recording
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.1em]">
          {page > 1 ? (
            <Link href={href(origin, page - 1)} className="text-inkSoft hover:text-lacquer">
              ← Previous
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
          {hasNext ? (
            <Link href={href(origin, page + 1)} className="text-inkSoft hover:text-lacquer">
              Next {PAGE_SIZE} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

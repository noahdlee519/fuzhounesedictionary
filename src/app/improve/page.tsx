import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import Recorder from "@/components/Recorder";
import SavedNotice from "@/components/SavedNotice";
import SuggestBox, { type SenseOption } from "@/components/SuggestBox";
import { formatOrigin, ORIGIN_AREAS, ORIGIN_GROUPS, originArea } from "@/lib/origins";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Improve the dictionary",
  description:
    "Every word in the Fuzhounese Dictionary that is still missing something — a recording, IPA, an example sentence — so you can work straight down the list.",
  alternates: { canonical: "/improve" },
};

const PAGE_SIZE = 25;

/* One screen, one list, fix-and-move-on. A speaker with twenty minutes should
   get through twenty words without ever navigating between entries.
   Everything sent from here waits for an editor: see supabase/suggestions.sql. */

export default async function ImprovePage({
  searchParams,
}: {
  searchParams: { page?: string; origin?: string; sent?: string; problem?: string };
}) {
  const { user } = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          Improve the dictionary
        </h1>
        <p className="text-inkSoft">
          Sign in and this page becomes a list of every word still missing something, with a record
          button beside each one and a place to add its pronunciation or an example sentence.
        </p>
        <div className="flex justify-center">
          <SignInButton next="/improve" />
        </div>
      </div>
    );
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const originParam = (searchParams.origin ?? "").trim();
  const origin = originArea(originParam) ? originParam : "";

  const supabase = createClient();
  let query = supabase
    .from("needs_work")
    .select(
      "id, headword, hanzi, romanization, short_gloss, origin_area, origin_locality, votes, needs_recording, needs_ipa, needs_example",
      { count: "exact" }
    )
    .or("needs_recording.eq.true,needs_ipa.eq.true,needs_example.eq.true");
  if (origin) query = query.eq("origin_area", origin);

  const { data, count, error } = await query
    .order("votes", { ascending: false })
    .order("headword", { ascending: true })
    .range(from, to);

  const rows = data ?? [];
  const total = count ?? 0;
  const hasNext = to + 1 < total;

  const ids = rows.map((r: any) => r.id);

  // The senses of the words on this page, so an example can say which meaning
  // it belongs to. Only fetched for the 25 rows on screen.
  const senses: Record<string, SenseOption[]> = {};
  // What this user already has in the queue, so we show "awaiting review"
  // instead of inviting them to send the same thing again. RLS means this only
  // ever returns their own rows.
  const mine: Record<string, { ipa: boolean; example: boolean }> = {};

  if (ids.length) {
    const [{ data: senseRows }, { data: pendingRows }] = await Promise.all([
      supabase.from("senses").select("id, entry_id, definition_en, sort").in("entry_id", ids),
      supabase
        .from("suggestions")
        .select("entry_id, kind")
        .eq("contributor_id", user.id)
        .eq("status", "pending")
        .in("entry_id", ids),
    ]);

    for (const s of (senseRows ?? []) as any[]) {
      (senses[s.entry_id] ??= []).push({ id: s.id, definition_en: s.definition_en });
    }
    for (const list of Object.values(senses)) {
      list.sort((a, b) => (a.definition_en ?? "").localeCompare(b.definition_en ?? ""));
    }
    for (const s of (pendingRows ?? []) as any[]) {
      mine[s.entry_id] ??= { ipa: false, example: false };
      if (s.kind === "ipa") mine[s.entry_id].ipa = true;
      if (s.kind === "example") mine[s.entry_id].example = true;
    }
  }

  const href = (o: string, p = 1) =>
    `/improve?${new URLSearchParams({ ...(o ? { origin: o } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  const chip = (label: string, to: string, active: boolean) => (
    <Link
      key={label}
      href={to}
      aria-current={active ? "true" : undefined}
      className={
        "border px-2.5 py-1 text-[13px] transition-colors " +
        (active
          ? "border-lacquer bg-lacquer text-paper"
          : "border-rule text-inkSoft hover:border-lacquer hover:text-lacquer")
      }
    >
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
      <section className="space-y-3 border-b border-rule pb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            Improve the dictionary
          </h1>
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
            {total.toLocaleString()} need work
          </span>
        </div>
        <p className="max-w-[68ch] text-[17px] leading-relaxed text-inkSoft">
          Every word still missing something, the most-requested first. Fix one, move to the next, do
          not leave the page. Say the word on its own, at a normal speed, in your own variety of
          Fuzhounese. If you are not sure of a word, skip it.
        </p>
        <p className="max-w-[68ch] text-sm text-inkSoft">
          Each word shows what it is short of. Click a tag to add it. Everything you send —
          recordings, pronunciations, sentences — waits for an editor before it appears on the site.
        </p>
        <p className="max-w-[68ch] text-sm text-inkSoft">
          Your contributions are labelled with where your Fuzhounese is from, which you can set on{" "}
          <Link href="/account" className="text-lacquer hover:underline">
            your account page
          </Link>
          . That is what makes them useful to someone comparing counties later.
        </p>
      </section>

      {(sentLabel || searchParams.problem) && (
        <div className="flex flex-wrap items-center gap-3 border-l-2 border-lacquer bg-surface px-4 py-3">
          {sentLabel ? (
            <SavedNotice message={`✓ ${sentLabel} — thank you`} />
          ) : (
            <p role="alert" className="text-sm text-inkSoft">
              {searchParams.problem}
            </p>
          )}
        </div>
      )}

      <section className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          Limit to words from
        </p>
        <div className="flex flex-wrap gap-2">
          {chip("Anywhere", href(""), !origin)}
          {ORIGIN_GROUPS.flatMap((g) =>
            ORIGIN_AREAS.filter((a) => a.group === g).map((a) =>
              chip(`${a.label} ${a.hanzi}`, href(a.code), origin === a.code)
            )
          )}
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

      <ol className="divide-y divide-rule border-y border-rule">
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
                      <SuggestBox kind="ipa" entryId={r.id} pending={mine[r.id]?.ipa} />
                    )}
                    {r.needs_example && (senses[r.id]?.length ?? 0) > 0 && (
                      <SuggestBox
                        kind="example"
                        entryId={r.id}
                        senses={senses[r.id]}
                        pending={mine[r.id]?.example}
                      />
                    )}
                  </div>
                )}
              </div>

              {r.needs_recording ? (
                <Recorder userId={user.id} entryId={r.id} kind="headword" label="Needs a recording" />
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
          <span className="text-inkFaint">Page {page}</span>
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

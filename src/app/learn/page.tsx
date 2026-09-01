import Link from "next/link";
import EntryCard, { type CardProps } from "@/components/EntryCard";
import { createClient } from "@/lib/supabase/server";
import { PARTS_OF_SPEECH } from "@/lib/constants";
import { toCard } from "@/lib/entries";
import { ORIGIN_AREAS, ORIGIN_GROUPS, originArea } from "@/lib/origins";
import type { Metadata } from "next";
import Guide, { Contents, Sources } from "./Guide";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

export const metadata: Metadata = {
  title: "Learn Fuzhounese",
  description:
    "How Fuzhounese works: its seven tones, tone sandhi, initial assimilation, how it is written down, how it differs from Mandarin, a phrasebook, and every word in the dictionary A to Z.",
  alternates: { canonical: "/learn" },
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { page?: string; pos?: string; origin?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const posParam = (searchParams.pos ?? "").trim();
  const pos = (PARTS_OF_SPEECH as readonly string[]).includes(posParam) ? posParam : "";

  const originParam = (searchParams.origin ?? "").trim();
  const origin = originArea(originParam) ? originParam : "";

  const supabase = createClient();
  const senseCols = "definition_en, part_of_speech, sort";
  let query = supabase
    .from("entries")
    .select(
      `id, hanzi, romanization, headword, audio_url, senses${pos ? "!inner" : ""}(${senseCols})`,
      { count: "exact" }
    )
    .eq("status", "approved");

  if (pos) query = query.eq("senses.part_of_speech", pos);
  if (origin) query = query.eq("origin_area", origin);

  const { data, count } = await query.order("headword", { ascending: true }).range(from, to);

  const entries: CardProps[] = (data ?? []).map(toCard);

  const total = count ?? 0;
  const hasNext = to + 1 < total;
  const pageHref = (n: number) =>
    `/learn?${new URLSearchParams({
      ...(pos ? { pos } : {}),
      ...(origin ? { origin } : {}),
      page: String(n),
    })}#words`;

  // links that toggle one filter while keeping the other
  const withPos = (p: string) =>
    `/learn?${new URLSearchParams({ ...(p ? { pos: p } : {}), ...(origin ? { origin } : {}) })}#words`;
  const withOrigin = (o: string) =>
    `/learn?${new URLSearchParams({ ...(pos ? { pos } : {}), ...(o ? { origin: o } : {}) })}#words`;

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={label}
      href={href}
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

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          Learn Fuzhounese
        </h1>
        <p className="max-w-[68ch] text-[17px] leading-relaxed text-inkSoft">
          A dictionary can tell you what a word means. It cannot tell you that the word changes shape
          when you put another one after it, which in Fuzhounese it almost always does. This page is
          for that. Open whichever section you need.
        </p>
        <p className="max-w-[68ch] text-[17px] leading-relaxed text-inkSoft">
          Everything here is sourced, and the sources are listed at the bottom. Where something has
          not been confirmed by a speaker, it says so.
        </p>
      </section>

      <Contents />

      <Guide />

      <div id="words" className="flex scroll-mt-24 flex-wrap items-baseline justify-between gap-3 border-t border-rule pt-6">
        <h2 className="font-display text-xl font-bold uppercase tracking-tight sm:text-2xl">All words</h2>
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          {total.toLocaleString()} {pos ? pos : "entr"}
          {pos ? (total === 1 ? "" : "s") : total === 1 ? "y" : "ies"}
          {origin ? ` from ${originArea(origin)!.label}` : ""}
        </span>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Part of speech</p>
        <div className="flex flex-wrap gap-2">
          {chip("All", withPos(""), !pos)}
          {PARTS_OF_SPEECH.map((p) => chip(p, withPos(p), pos === p))}
        </div>

        <p className="pt-2 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Where it is from</p>
        <div className="flex flex-wrap gap-2">
          {chip("Anywhere", withOrigin(""), !origin)}
          {ORIGIN_GROUPS.flatMap((g) =>
            ORIGIN_AREAS.filter((a) => a.group === g).map((a) =>
              chip(`${a.label} ${a.hanzi}`, withOrigin(a.code), origin === a.code)
            )
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
        {entries.length === 0 && (
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
          <Link href={pageHref(page - 1)} className="text-inkSoft hover:text-lacquer">← Previous</Link>
        ) : <span />}
        <span className="text-inkFaint">Page {page}</span>
        {hasNext ? (
          <Link href={pageHref(page + 1)} className="text-inkSoft hover:text-lacquer">Next →</Link>
        ) : <span />}
      </div>

      <Sources />
    </div>
  );
}

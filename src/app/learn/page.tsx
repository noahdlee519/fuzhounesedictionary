import Link from "next/link";
import EntryCard, { type CardProps } from "@/components/EntryCard";
import { createClient } from "@/lib/supabase/server";
import { PARTS_OF_SPEECH } from "@/lib/constants";
import { toCard } from "@/lib/entries";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

export const metadata: Metadata = {
  title: "Browse all words",
  description:
    "Every word in the Fuzhounese Dictionary, A to Z, filterable by part of speech.",
  alternates: { canonical: "/learn" },
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { page?: string; pos?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const posParam = (searchParams.pos ?? "").trim();
  const pos = (PARTS_OF_SPEECH as readonly string[]).includes(posParam) ? posParam : "";

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

  const { data, count } = await query.order("headword", { ascending: true }).range(from, to);

  const entries: CardProps[] = (data ?? []).map(toCard);

  const total = count ?? 0;
  const hasNext = to + 1 < total;
  const pageHref = (n: number) => `/learn?${new URLSearchParams({ ...(pos ? { pos } : {}), page: String(n) })}`;

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
    <div className="space-y-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">Browse all words</h1>
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          {total.toLocaleString()} {pos ? pos : "entr"}
          {pos ? (total === 1 ? "" : "s") : total === 1 ? "y" : "ies"}
        </span>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Part of speech</p>
        <div className="flex flex-wrap gap-2">
          {chip("All", "/learn", !pos)}
          {PARTS_OF_SPEECH.map((p) => chip(p, `/learn?pos=${encodeURIComponent(p)}`, pos === p))}
        </div>
      </div>

      <div className="grid gap-3">
        {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
        {entries.length === 0 && (
          <p className="text-inkSoft">
            {pos ? `No ${pos}s yet.` : "No approved words yet. Be the first to add one!"}
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
    </div>
  );
}

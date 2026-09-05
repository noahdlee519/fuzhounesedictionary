import Link from "next/link";
import { notFound } from "next/navigation";
import EntryCard, { type CardProps } from "@/components/EntryCard";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { formatOrigin } from "@/lib/origins";
import { one, toCards } from "@/lib/entries";
import RecordingByRow, { type RecordingByRowProps } from "@/components/RecordingByRow";
import { SITE_NAME } from "@/lib/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, origin_area, origin_locality")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) return { title: "Contributor not found" };

  const name = data.display_name || "A contributor";
  const origin = formatOrigin(data.origin_area, data.origin_locality);
  return {
    title: name,
    description: `Words contributed to the ${SITE_NAME} by ${name}${origin ? `, whose Fuzhounese is from ${origin}` : ""}.`,
    alternates: { canonical: `/contributor/${params.id}` },
    robots: { index: false, follow: true },
  };
}

export default async function ContributorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, origin_area, origin_locality, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!profile) notFound();

  // Words and recordings are independent; fetched together. Recordings are
  // approved only, on words that are live — the public policy already limits
  // it to that, and saying so here keeps the page the same whoever is looking
  // at it (the owner and editors can see more).
  const [
    { data, count, error: entriesError },
    { data: recData, count: recCount, error: recError },
  ] = await Promise.all([
    supabase
      .from("entries")
      .select("id, hanzi, romanization, headword, audio_url, senses(definition_en, part_of_speech, sort)", {
        count: "exact",
      })
      .eq("contributor_id", params.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("recordings")
      .select("id, kind, audio_url, status, note, created_at, entry:entries(id, headword, hanzi, romanization, status, senses(definition_en, sort))", {
        count: "exact",
      })
      .eq("contributor_id", params.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  // Same card, same recording count, as everywhere else on the site.
  const entries: CardProps[] = await toCards(supabase, data ?? []);
  const recordings: RecordingByRowProps[] = (recData ?? []).map((r: any) => ({
    ...r,
    entry: one(r.entry),
  }));
  const unavailable = (
    <p className="border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">
      Unavailable at the moment. Please check back shortly.
    </p>
  );

  const origin = formatOrigin(profile.origin_area, profile.origin_locality);
  const total = count ?? 0;
  const totalRecs = recCount ?? 0;
  const since = new Date(profile.created_at).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-8">
      <section className="flex items-start justify-between gap-6 border-b border-rule pb-6">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">Contributor</p>
          <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            {profile.display_name || "Anonymous contributor"}
          </h1>
          {origin && (
            <p className="mt-3 text-inkSoft">
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Fuzhounese from </span>
              {origin}
            </p>
          )}
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
            Member since {since}
          </p>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
            {total.toLocaleString()} word{total === 1 ? "" : "s"} ·{" "}
            {totalRecs.toLocaleString()} recording{totalRecs === 1 ? "" : "s"}
          </p>
        </div>
        {/* Bigger than the header avatar — this is the one page about the person. */}
        <Avatar src={profile.avatar_url} name={profile.display_name} size={80} className="ring-1 ring-rule" />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold uppercase tracking-tight">Words</h2>
        {entriesError ? (
          unavailable
        ) : entries.length === 0 ? (
          <p className="text-inkSoft">No published words yet.</p>
        ) : (
          <div className="grid gap-3">
            {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="border-t border-rule pt-5 font-display text-lg font-bold uppercase tracking-tight">
          Recordings
        </h2>
        {recError ? (
          unavailable
        ) : recordings.length === 0 ? (
          <p className="text-inkSoft">No published recordings yet.</p>
        ) : (
          <div className="grid gap-3">
            {recordings.map((r) => <RecordingByRow key={r.id} recording={r} />)}
          </div>
        )}
      </section>

      <p className="border-t border-rule pt-5">
        <Link href="/learn" className="font-mono text-xs uppercase tracking-[0.1em] text-inkSoft hover:text-lacquer">
          Browse all words →
        </Link>
      </p>
    </div>
  );
}

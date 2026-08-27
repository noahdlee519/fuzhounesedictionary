import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { requestWord } from "@/app/wanted/actions";
import type { Sense } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EntryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { user } = await getSessionUser();
  const { data: entry } = await supabase
    .from("entries")
    .select("*, senses(*), contributor:profiles(display_name)")
    .eq("id", params.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!entry) notFound();

  const senses: Sense[] = [...(entry.senses ?? [])].sort(
    (a: Sense, b: Sense) => (a.sort ?? 0) - (b.sort ?? 0)
  );
  const credit = (entry as any).contributor?.display_name as string | undefined;

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
        {entry.variety && (
          <span className="font-mono text-[11px] uppercase tracking-wide text-inkSoft ring-1 ring-rule px-2 py-1">
            {entry.variety}
          </span>
        )}
      </header>

      {entry.audio_url ? (
        <audio controls src={entry.audio_url} className="w-full max-w-sm">
          Your browser does not support audio playback.
        </audio>
      ) : (
        <div className="border border-dashed border-rule p-4">
          <p className="text-sm text-inkSoft">No pronunciation yet. Know how this is said?</p>
          {user ? (
            <form action={requestWord} className="mt-3">
              <input type="hidden" name="entry_id" value={entry.id} />
              <input type="hidden" name="term" value={entry.hanzi || entry.romanization || entry.headword} />
              <input type="hidden" name="back" value={`/entry/${entry.id}`} />
              <button className="border border-lacquer bg-lacquer px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-paper transition-colors hover:bg-transparent hover:text-lacquer">
                🔊 Request a pronunciation
              </button>
            </form>
          ) : (
            <Link href="/wanted" className="mt-2 inline-block text-sm text-lacquer hover:underline">
              Sign in to request a recording →
            </Link>
          )}
        </div>
      )}

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
                {s.example_gloss && <span className="text-inkFaint"> — {s.example_gloss}</span>}
              </p>
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

      <p className="font-mono text-xs uppercase tracking-wider text-inkFaint">
        Added {new Date(entry.created_at).toLocaleDateString()}
        {credit ? ` · contributed by ${credit}` : ""}
      </p>
    </article>
  );
}

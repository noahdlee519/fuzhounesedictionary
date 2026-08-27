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
    <article className="space-y-6">
      <Link href="/" className="text-sm text-accent hover:underline">← Back to search</Link>

      <header className="flex flex-wrap items-baseline gap-4">
        {entry.hanzi && <h1 className="font-serif text-5xl font-bold">{entry.hanzi}</h1>}
        <span className="romanization text-3xl font-semibold text-accent">
          {entry.romanization || entry.headword}
        </span>
        {entry.variety && (
          <span className="rounded bg-stone-100 px-2 py-1 text-xs text-stone-500 dark:bg-stone-800">
            {entry.variety}
          </span>
        )}
      </header>

      {entry.ipa && <p className="text-stone-500">/{entry.ipa}/</p>}

      {entry.audio_url ? (
        <audio controls src={entry.audio_url} className="w-full max-w-sm">
          Your browser does not support audio playback.
        </audio>
      ) : (
        <div className="rounded-lg border border-dashed border-stone-300 p-4 dark:border-stone-700">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            No pronunciation yet. Know how this is said?
          </p>
          {user ? (
            <form action={requestWord} className="mt-2">
              <input type="hidden" name="entry_id" value={entry.id} />
              <input type="hidden" name="term" value={entry.hanzi || entry.romanization || entry.headword} />
              <input type="hidden" name="back" value={`/entry/${entry.id}`} />
              <button className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
                🔊 Request a pronunciation
              </button>
            </form>
          ) : (
            <Link href="/wanted" className="mt-2 inline-block text-sm text-accent hover:underline">
              Sign in to request a recording →
            </Link>
          )}
        </div>
      )}

      <ol className="space-y-4">
        {senses.map((s, i) => (
          <li key={s.id} className="border-l-2 border-accentSoft pl-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-stone-400">{i + 1}.</span>
              {s.part_of_speech && (
                <span className="text-sm italic text-accent">{s.part_of_speech}</span>
              )}
            </div>
            <p className="text-lg">{s.definition_en}</p>
            {s.gloss_zh && <p className="text-stone-500">中文：{s.gloss_zh}</p>}
            {s.example && (
              <p className="mt-1 text-sm">
                <span className="romanization text-stone-700 dark:text-stone-300">{s.example}</span>
                {s.example_gloss && <span className="text-stone-500"> — {s.example_gloss}</span>}
              </p>
            )}
          </li>
        ))}
      </ol>

      {entry.notes && (
        <div className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          <span className="font-semibold">Notes: </span>{entry.notes}
        </div>
      )}

      <p className="text-xs text-stone-400">
        Added {new Date(entry.created_at).toLocaleDateString()}
        {credit ? ` · contributed by ${credit}` : ""}
      </p>
    </article>
  );
}

import Link from "next/link";

export interface CardProps {
  id: string;
  hanzi?: string | null;
  romanization?: string | null;
  headword: string;
  pos?: string | null;
  gloss?: string | null;
  hasAudio?: boolean;
}

export default function EntryCard({ entry }: { entry: CardProps }) {
  return (
    <Link
      href={`/entry/${entry.id}`}
      className="block rounded-xl border border-stone-200 bg-white p-4 transition hover:border-accent hover:shadow-sm dark:border-stone-700 dark:bg-stone-900"
    >
      <div className="flex items-baseline gap-3">
        {entry.hanzi && (
          <span className="font-serif text-2xl leading-none">{entry.hanzi}</span>
        )}
        <span className="romanization text-lg font-semibold text-accent">
          {entry.romanization || entry.headword}
        </span>
        {entry.hasAudio && <span title="has audio" className="text-sm">🔊</span>}
        {entry.pos && (
          <span className="ml-auto rounded bg-accentSoft px-2 py-0.5 text-xs italic text-accent">
            {entry.pos}
          </span>
        )}
      </div>
      {entry.gloss && <p className="mt-1 text-stone-700 dark:text-stone-300">{entry.gloss}</p>}
    </Link>
  );
}

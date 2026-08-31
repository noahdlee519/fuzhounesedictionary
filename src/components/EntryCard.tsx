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
      className="group block border border-rule bg-surface px-5 py-4 transition-colors hover:border-lacquer"
    >
      <div className="flex items-baseline gap-3">
        {entry.hanzi && (
          <span className="font-display text-2xl font-bold leading-none">{entry.hanzi}</span>
        )}
        <span className="romanization font-display text-lg font-semibold text-lacquer">
          {entry.romanization || entry.headword}
        </span>
        {entry.hasAudio && (
          <span className="text-sm">
            <span aria-hidden>🔊</span>
            <span className="sr-only">has a recording</span>
          </span>
        )}
        {entry.pos && (
          <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-inkFaint">
            {entry.pos}
          </span>
        )}
      </div>
      {entry.gloss && <p className="mt-1 text-inkSoft">{entry.gloss}</p>}
    </Link>
  );
}

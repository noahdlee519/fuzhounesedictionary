import Link from "next/link";

export interface CardProps {
  id: string;
  hanzi?: string | null;
  romanization?: string | null;
  headword: string;
  pos?: string | null;
  gloss?: string | null;
  /** How many recordings this word has: the legacy audio_url counts as one,
   *  plus every approved row in the recordings table. */
  recordings?: number;
}

/* Capped so one very popular word cannot stretch the card. */
function countLabel(n: number) {
  return n > 99 ? "99+ recordings" : `${n} recordings`;
}

function Speaker() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M8.5 2.5 4.5 5.5h-2.5v5h2.5l4 3z" />
      <path d="M11 5.5a3.5 3.5 0 0 1 0 5" strokeLinecap="round" />
    </svg>
  );
}

export default function EntryCard({ entry }: { entry: CardProps }) {
  const n = entry.recordings ?? 0;

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

        {/* Part of speech, with the recording count beneath it. The whole card is
            already a link, so this needs no handler of its own — clicking it
            opens the entry like clicking anywhere else. */}
        {(entry.pos || n > 0) && (
          <span className="ml-auto flex flex-col items-end gap-1 self-start text-right">
            {entry.pos && (
              <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">
                {entry.pos}
              </span>
            )}
            {n > 0 && (
              <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-inkFaint transition-colors group-hover:text-lacquer">
                <Speaker />
                {n > 1 ? (
                  countLabel(n)
                ) : (
                  <span className="sr-only">1 recording</span>
                )}
              </span>
            )}
          </span>
        )}
      </div>
      {entry.gloss && <p className="mt-1 text-inkSoft">{entry.gloss}</p>}
    </Link>
  );
}

import Link from "next/link";
import PlayButton from "./PlayButton";

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
  /** How many meanings the word has. Above one, the card says so, because
   *  the gloss it shows is only the meaning that matched the search. */
  senses?: number;
  /** A line under the gloss: who read it and where, on the home page feed. */
  caption?: string;
  /** Where the word is from, for the card's footer. */
  origin?: string | null;
  /** The recording the card's play button plays — the best-liked reading of
   *  the word, or the legacy file on the entry. */
  audio?: string | null;
}

/* A word as a card, in the mock-up's grid style: characters large in the
   serif, romanization in bold, the gloss in grey clipped to two lines, and a
   footer of small facts — part of speech, how many recordings (or that it
   needs one), origin. At the right, the word's best recording behind a big
   play button, with "more" under it when there are others to hear on the
   entry page. Cards sit in a grid whose gaps are hairlines, so they carry no
   border of their own. The play button is a sibling of the link, not inside
   it: a button inside an anchor is invalid and unreachable by keyboard. */
export default function EntryCard({ entry }: { entry: CardProps }) {
  const n = entry.recordings ?? 0;
  const href = `/entry/${entry.id}`;

  return (
    <div className="relative flex min-h-[150px] gap-3 bg-paper p-5 transition-colors hover:bg-surface2">
      <Link href={href} className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']">
        {entry.hanzi ? (
          <div className="han text-[32px] font-medium leading-[1.15]">{entry.hanzi}</div>
        ) : (
          <div className="text-[26px] font-semibold leading-[1.15] tracking-tight">{entry.romanization || entry.headword}</div>
        )}
        {entry.hanzi && (
          <div className="romanization mt-1.5 text-sm font-semibold">{entry.romanization || entry.headword}</div>
        )}
        {entry.gloss && (
          <p className="mt-1.5 line-clamp-2 text-[13px] text-inkSoft">
            {entry.gloss}
            {(entry.senses ?? 0) > 1 && <span className="text-inkMute"> · {entry.senses} meanings</span>}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] font-semibold tracking-[.02em] text-inkMute">
          {entry.pos && <span>{entry.pos}</span>}
          {n > 0 ? (
            <span className="text-green">
              {n} recording{n === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-amber">needs a recording</span>
          )}
          {entry.origin && <span>{entry.origin}</span>}
        </div>
        {entry.caption && <p className="mt-2 text-xs text-inkSoft">{entry.caption}</p>}
      </Link>
      {entry.audio && (
        <div className="relative z-10 flex shrink-0 flex-col items-center gap-1 self-start">
          <PlayButton src={entry.audio} size="md" label={`Play ${entry.hanzi || entry.romanization || entry.headword}`} />
          {n > 1 && (
            <Link href={`${href}#recordings`} className="text-[11px] font-medium text-inkSoft hover:text-lacquer">
              more →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

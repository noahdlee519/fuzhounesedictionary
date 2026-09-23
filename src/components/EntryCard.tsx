import Link from "next/link";
import PlayButton from "./PlayButton";
import RecordPrompt from "./RecordPrompt";
import type { AudioCredit } from "@/lib/entries";

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
  /** Which meaning the gloss is, counting from 1: shown before it when the
   *  word has more than one, so the number itself says there are others. */
  senseNo?: number;
  /** A line under the gloss: who read it and where, on the home page feed. */
  caption?: string;
  /** Where the word is from, for the card's footer. */
  origin?: string | null;
  /** The recording the card's play button plays — the best-liked reading of
   *  the word, or the legacy file on the entry. */
  audio?: string | null;
  /** Who recorded that take, for the tooltip on the audio button. */
  audioCredit?: AudioCredit | null;
}

/* A word as a card, in the mock-up's grid style: characters large in the
   serif, romanization in bold, the gloss in grey clipped to two lines, and a
   footer of small facts — part of speech, origin. At the right, the word's
   best recording behind a big play button, or, with none, an empty dotted
   circle. The footer's right end says "needs a recording", "1 recording so
   far", or "Listen to N more recordings" when there are others to hear. Cards sit in a grid whose gaps are hairlines, so they carry no
   border of their own. The play button is a sibling of the link, not inside
   it: a button inside an anchor is invalid and unreachable by keyboard. */
export default function EntryCard({ entry }: { entry: CardProps }) {
  const n = entry.recordings ?? 0;
  const href = `/entry/${entry.id}`;

  /* Two rows: the word and its audio button, then a footer that spans the
     whole card — part of speech and origin at the left, "Listen to N more
     recordings" at the right on one line. The footer sits outside the card's
     link (the link's ::after still makes the whole card clickable), so the
     "Listen" link is not a link inside a link. The audio button sits at z-20,
     above that link (z-10), so its credit panel is never covered by it. */
  return (
    <div className="relative flex flex-col bg-paper p-4 transition-colors hover:z-20 hover:bg-surface2 focus-within:z-20 sm:min-h-[150px] sm:p-5">
      <div className="flex flex-1 gap-3">
        <Link href={href} className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']">
          {entry.hanzi ? (
            <div className="han text-[32px] font-medium leading-[1.15]">{entry.hanzi}</div>
          ) : (
            <div className="text-[26px] font-semibold leading-[1.15] tracking-tight">{entry.romanization || entry.headword}</div>
          )}
          {entry.hanzi && (
            <div className="romanization mt-1.5 text-sm font-semibold">{entry.romanization || entry.headword}</div>
          )}
          {/* The meaning in ink; with more than one, the count always on a
              line of its own under it. */}
          {/* Under characters, the meaning starts below the audio button, so
              it runs the card's full width, under the button's column
              (-mr = the button's 56px plus the 12px gap), instead of
              wrapping early (Noah, 23 Sep 2026). Without characters the
              word is one short line and the meaning would meet the button,
              so it keeps to its column. */}
          {entry.gloss && (
            <p className={`mt-1.5 line-clamp-2 text-[13px] text-ink${entry.hanzi ? " -mr-[68px]" : ""}`}>
              {(entry.senses ?? 0) > 1 && <span className="tabular-nums text-inkMute">{entry.senseNo ?? 1}. </span>}
              {entry.gloss}
            </p>
          )}
          {entry.gloss && (entry.senses ?? 0) > 1 && (
            <p className="mt-0.5 text-[12px] text-inkMute">{entry.senses} meanings</p>
          )}
          {entry.caption && <p className="mt-2 text-xs text-inkSoft">{entry.caption}</p>}
        </Link>
        {entry.audio ? (
          <div className="relative z-20 shrink-0 self-start">
            <PlayButton
              src={entry.audio}
              size="md"
              label={`Play ${entry.hanzi || entry.romanization || entry.headword}`}
              credit={entry.audioCredit}
              tipAlign="right"
            />
          </div>
        ) : (
          /* No recording yet: a dotted circle with a microphone where the
             play button would be, the size of that button, linking to the
             word's recorder. Above the card's link (z-20), like the play
             button, so it takes its own clicks. */
          <div className="relative z-20 shrink-0 self-start">
            <RecordPrompt entryId={entry.id} word={entry.hanzi || entry.romanization || entry.headword} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-x-3 text-[11px] font-semibold tracking-[.02em] text-inkMute">
        <span className="flex min-w-0 flex-wrap gap-x-2.5 gap-y-1">
          {entry.pos && <span>{entry.pos}</span>}
          {entry.origin && <span>{entry.origin}</span>}
        </span>
        {!entry.audio && (
          <span className="shrink-0 whitespace-nowrap text-amber">needs a recording</span>
        )}
        {entry.audio && n === 1 && (
          <span className="shrink-0 whitespace-nowrap font-medium text-inkFaint">1 recording so far</span>
        )}
        {entry.audio && n > 1 && (
          <Link
            href={`${href}#recordings`}
            className="relative z-10 shrink-0 whitespace-nowrap font-medium text-inkSoft hover:text-lacquer"
          >
            Listen to {n - 1} more recording{n - 1 === 1 ? "" : "s"}
          </Link>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

/* The empty dotted circle that stands where a play button would be, on a word
   with no recording yet, with a microphone in it: the one thing this word is
   missing, and an invitation to supply it. The whole circle is a link to the
   recorder on the word's page (#recordings, the "Say this word" section).

   Grey at rest so a grid of unrecorded words stays quiet; the circle and the
   microphone turn lacquer on hover or keyboard focus. Same sizes as
   PlayButton's md (56px, on word cards) and xs (36px, in Learn's Basic
   lessons), so a row lines up whether or not a word has been recorded. */
export default function RecordPrompt({
  entryId,
  word,
  size = "md",
  className = "",
}: {
  entryId: string;
  /** For the accessible name: "Record 食飯". */
  word: string;
  size?: "md" | "xs";
  className?: string;
}) {
  const L = pick(getLang());
  const box = size === "md" ? "h-14 w-14 border-2" : "h-9 w-9 border";
  const glyph = size === "md" ? 22 : 15;
  return (
    <Link
      href={`/entry/${entryId}#recordings`}
      aria-label={L("Record {w}: no recording yet", "為「{w}」錄音：還沒有錄音", { w: word })}
      title={L("No recording yet. Record it", "還沒有錄音，來錄一段吧")}
      className={`group inline-flex shrink-0 items-center justify-center rounded-full border-dashed border-ruleStrong text-inkMute transition-[color,border-color,transform] duration-150 hover:border-lacquer hover:text-lacquer focus-visible:border-lacquer focus-visible:text-lacquer active:scale-[.96] ${box} ${className}`}
    >
      {/* A microphone: capsule, cradle, stand. Drawn, not an emoji, so it is
          the same on every platform and takes the text colour. */}
      <svg width={glyph} height={glyph} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5.75" y="1.75" width="4.5" height="8" rx="2.25" />
        <path d="M3.5 7.75a4.5 4.5 0 0 0 9 0" />
        <path d="M8 12.25v2" />
      </svg>
    </Link>
  );
}

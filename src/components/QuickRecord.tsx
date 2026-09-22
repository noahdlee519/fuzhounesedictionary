"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Recorder from "./Recorder";
import { useL } from "@/components/LangProvider";

type Word = { id: string; hanzi: string | null; romanization: string | null; headword: string; gloss: string | null };

/* Quick record: one word at a time, big, with the recorder under it and a
   "Next word" that moves along, so a speaker can say ten words in a row.

   Every word on the current page of the worklist arrives with the page, so
   "Next word" within it is instant: no trip to the server, just the next
   one from the list already in hand. The address is updated in place
   (?n=), so a reload stays on the same word. Only after the last word on the
   page does "Next word" load the following page, and that page is
   fetched ahead of time as soon as the last word is showing (a Link with
   prefetch), so it too arrives without a wait. */
export default function QuickRecord({
  words,
  start,
  nextPage,
  userId,
  isEditor,
}: {
  words: Word[];
  /** Which word to open on (?n=). */
  start: number;
  /** Where "Next word" goes after the last word on this page. */
  nextPage: string;
  userId: string;
  isEditor: boolean;
}) {
  const L = useL();
  const [i, setI] = useState(() => (words.length ? start % words.length : 0));
  // Follow the word, not the position, when the list is refreshed under us
  // (saving a recording refreshes the page).
  const current = useRef<string | null>(words[i]?.id ?? null);
  useEffect(() => {
    const at = words.findIndex((w) => w.id === current.current);
    if (at >= 0 && at !== i) setI(at);
    else if (at < 0 && i >= words.length) setI(Math.max(0, words.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const word = words[i];
  if (!word) return null;
  const last = i + 1 >= words.length;

  function next() {
    const to = i + 1;
    current.current = words[to]?.id ?? null;
    setI(to);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("n", String(to));
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* the address just stays as it was */
    }
  }

  return (
    <section id="quick" className="scroll-mt-24 rounded-sm border border-rule bg-surface p-6 sm:p-8">
      <p className="eyebrow">{L("Quick record", "快速錄音")}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {word.hanzi && <span className="han text-[56px] font-bold leading-none">{word.hanzi}</span>}
        <span className="romanization text-2xl font-semibold text-lacquer">{word.romanization || word.headword}</span>
      </div>
      {word.gloss && <p className="mt-2 text-lg text-inkSoft">{word.gloss}</p>}
      <div className="mt-5">
        <Recorder key={word.id} userId={userId} entryId={word.id} isEditor={isEditor} kind="headword" label={L("Say this word", "講出這個詞")} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-4">
        {last ? (
          <Link href={nextPage} prefetch className="btn btn-ghost btn-sm">
            {L("Next word →", "下一個詞 →")}
          </Link>
        ) : (
          <button type="button" onClick={next} className="btn btn-ghost btn-sm">
            {L("Next word →", "下一個詞 →")}
          </button>
        )}
        <span className="footnote">{L("Don't know this one? Skip it. Every word on the list below works the same way.", "不會講這個？跳過就好。下面清單裡的每個詞，錄法都一樣。")}</span>
      </div>
    </section>
  );
}

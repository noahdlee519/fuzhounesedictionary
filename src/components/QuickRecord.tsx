"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Recorder, { RECORDING_SAVED } from "./Recorder";
import { useL } from "@/components/LangProvider";

type Word = { id: string; hanzi: string | null; romanization: string | null; headword: string; gloss: string | null; senseId?: string | null };

const THANKS_MS = 7000;

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

  /* "Thank you! Record another?" — a red bar under the header after each
     word saved on this page, from Quick record or from the list below
     (Recorder announces every save on window). Styled like the language
     banner; leaves by itself after a few seconds, or with its ×. Only for
     recordings of words, not the follow-up sentence. */
  const [thanks, setThanks] = useState<{ top: number } | null>(null);
  const [shown, setShown] = useState(false);
  const timer = useRef<number | null>(null);
  const hideThanks = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setShown(false);
    timer.current = window.setTimeout(() => setThanks(null), 200);
  };
  useEffect(() => {
    const onSaved = (e: Event) => {
      if ((e as CustomEvent).detail?.kind !== "headword") return;
      if (timer.current) window.clearTimeout(timer.current);
      const bottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      setThanks({ top: Math.max(0, bottom) });
      setShown(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      timer.current = window.setTimeout(hideThanks, THANKS_MS);
    };
    window.addEventListener(RECORDING_SAVED, onSaved);
    return () => {
      window.removeEventListener(RECORDING_SAVED, onSaved);
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {thanks &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 z-[45]" style={{ top: thanks.top }}>
            <div className="wrap pt-3">
              <div
                role="status"
                className={
                  "pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm bg-lacquer px-5 py-3 text-paper transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none " +
                  (shown ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
                }
              >
                <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
                  {L("Thank you! Record another?", "謝謝你！再錄一個？")}
                </p>
                {last ? (
                  <Link href={nextPage} prefetch onClick={hideThanks} className="rounded-sm border border-paper/70 px-3 py-1 text-sm font-semibold transition-colors hover:bg-white/15">
                    {L("Next word", "下一個詞")}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      hideThanks();
                      next();
                      document.getElementById("quick")?.scrollIntoView({ block: "start", behavior: "smooth" });
                    }}
                    className="rounded-sm border border-paper/70 px-3 py-1 text-sm font-semibold transition-colors hover:bg-white/15"
                  >
                    {L("Next word", "下一個詞")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={hideThanks}
                  aria-label={L("Dismiss", "關閉")}
                  className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-lg leading-none transition-colors hover:bg-white/15"
                >
                  ×
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      <p className="eyebrow">{L("Quick record", "快速錄音")}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {word.hanzi && <span className="han text-[56px] font-bold leading-none">{word.hanzi}</span>}
        <span className="romanization text-2xl font-semibold text-lacquer">{word.romanization || word.headword}</span>
      </div>
      {word.gloss && <p className="mt-2 text-lg text-inkSoft">{word.gloss}</p>}
      <div className="mt-5">
        <Recorder key={word.id} userId={userId} entryId={word.id} isEditor={isEditor} kind="headword" phraseSenseId={word.senseId ?? undefined} label={L("Say this word", "講出這個詞")} />
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

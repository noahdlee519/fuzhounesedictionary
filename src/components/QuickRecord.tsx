"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Recorder, { RECORDING_SAVED } from "./Recorder";
import { useL } from "@/components/LangProvider";

type Word = {
  id: string;
  hanzi: string | null;
  romanization: string | null;
  headword: string;
  gloss: string | null;
  senseId?: string | null;
  /** Someone has recorded it already; yours is still wanted. */
  recorded?: boolean;
};

const THANKS_MS = 7000;

/* Quick record: one word at a time, big, so a speaker can say ten words in a
   row without scanning the list.

   Each word goes in two steps (Noah, 23 Sep 2026):
   1. "Say the word once or twice" — the recorder for the word itself.
   2. Once that is saved, a prompt to say it in a phrase or sentence of their
      own, with its recorder, saved as an example on the word's first
      meaning. Skippable: "Skip" moves to the next word.
   Then "Next word". A word with no meaning to hang a sentence on skips the
   second step.

   The words are a random batch (see improve/page.tsx, ?qo=), held here for
   the life of the batch: saving refreshes the page, and the refreshed list
   leaves out a word this person has now recorded to the cap, which would
   otherwise yank the card to another word halfway through the two steps.
   "Next word" within the batch is instant; after its last word, a new batch
   (a Link with prefetch, so it too arrives without a wait). The position is
   kept in the address (?n=), so a reload stays on the same word. */
export default function QuickRecord({
  words,
  start,
  batch,
  nextPage,
  userId,
  isEditor,
}: {
  words: Word[];
  /** Which word to open on (?n=). */
  start: number;
  /** The random starting point this batch was drawn from (?qo=), written
   *  into the address so a refresh keeps the same batch. */
  batch: number;
  /** Where "Next word" goes after the last word in this batch. */
  nextPage: string;
  userId: string;
  isEditor: boolean;
}) {
  const L = useL();
  const router = useRouter();

  // The batch, held while it lasts; a new batch (a new ?qo=) replaces it.
  const [list, setList] = useState<Word[]>(words);
  const [i, setI] = useState(() => (words.length ? start % words.length : 0));
  const heldBatch = useRef(batch);
  useEffect(() => {
    if (heldBatch.current === batch) return;
    heldBatch.current = batch;
    setList(words);
    setI(words.length ? start % words.length : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch]);

  // Pin the batch in the address on arrival, so the refresh that follows a
  // save draws the same words rather than a new random set.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("qo") !== String(batch)) {
        url.searchParams.set("qo", String(batch));
        window.history.replaceState(window.history.state, "", url);
      }
    } catch {
      /* the address just stays as it was */
    }
  }, [batch]);

  const word = list[i];
  const last = i + 1 >= list.length;

  // Which step of the current word: saying it, then using it, then done.
  const [step, setStep] = useState<"word" | "sentence" | "done">("word");
  useEffect(() => setStep("word"), [word?.id]);
  // The listener below is registered once; it reads the current word here.
  const currentWord = useRef<Word | undefined>(word);
  currentWord.current = word;

  /* "Thank you! Record another?" — a red bar under the header, for a word
     recorded from the list below the card. A save on the card itself moves
     the card to its next step instead, which says the same thing in place.
     Styled like the language banner; leaves by itself after a few seconds,
     or with its ×. */
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
      const detail = (e as CustomEvent).detail as { kind?: string; entryId?: string } | undefined;
      const here = currentWord.current;
      if (here && detail?.entryId === here.id) {
        if (detail.kind === "headword") setStep(here.senseId ? "sentence" : "done");
        else if (detail.kind === "example") setStep("done");
        return;
      }
      if (detail?.kind !== "headword") return;
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

  if (!word) return null;

  function next() {
    if (last) {
      router.push(nextPage);
      return;
    }
    const to = i + 1;
    setI(to);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("n", String(to));
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* the address just stays as it was */
    }
  }

  const shownWord = word.hanzi || word.romanization || word.headword;
  const nextBtn = (label: string, primary = false) =>
    last ? (
      <Link href={nextPage} prefetch className={`btn btn-sm ${primary ? "btn-primary" : "btn-ghost"}`}>
        {label}
      </Link>
    ) : (
      <button type="button" onClick={next} className={`btn btn-sm ${primary ? "btn-primary" : "btn-ghost"}`}>
        {label}
      </button>
    );

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
                {/* The word just saved was from the list, not the card, so
                    the card's word is still waiting: bring it into view. */}
                <button
                  type="button"
                  onClick={() => {
                    hideThanks();
                    document.getElementById("quick")?.scrollIntoView({ block: "start", behavior: "smooth" });
                  }}
                  className="rounded-sm border border-paper/70 px-3 py-1 text-sm font-semibold transition-colors hover:bg-white/15"
                >
                  {L("Next word", "下一個詞")}
                </button>
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
      {word.recorded && step === "word" && (
        <p className="mt-1 text-sm text-inkFaint">
          {L(
            "Someone has recorded this word already. Yours is welcome too: Fuzhounese sounds different from place to place.",
            "已經有人錄過這個詞了。也歡迎你來錄：福州話各地講法不一樣。"
          )}
        </p>
      )}

      {/* 1. The word itself. */}
      {step === "word" && (
        <div className="mt-5">
          <Recorder
            key={`${word.id}-word`}
            userId={userId}
            entryId={word.id}
            isEditor={isEditor}
            kind="headword"
            label={L("Say the word once or twice", "把這個詞講一兩次")}
          />
        </div>
      )}

      {/* 2. The word in use: a prompt that arrives once the word is saved. */}
      {step === "sentence" && word.senseId && (
        <div className="mt-5 space-y-4">
          <p className="text-sm font-semibold text-ink">✓ {L("Word saved. Thank you!", "詞已儲存，謝謝你！")}</p>
          <div className="animate-[page-fade_.25s_ease-out] space-y-2 rounded-sm border border-lacquer/40 bg-paper p-4 motion-reduce:animate-none sm:p-5">
            <p className="text-[17px] font-semibold text-ink">
              {L("Now try it in a phrase or sentence", "再用這個詞講一句話")}
            </p>
            <p className="text-sm text-inkSoft">
              {L(
                `Anything you would naturally say with ${shownWord}. It helps learners hear how the word is really used. Optional.`,
                `用「${shownWord}」講一句你平常會講的話。這樣學的人可以聽到這個詞實際怎麼用。可以跳過。`
              )}
            </p>
            <Recorder
              key={`${word.id}-sentence`}
              userId={userId}
              entryId={word.id}
              kind="example"
              senseId={word.senseId}
              isEditor={isEditor}
              phrase
            />
          </div>
        </div>
      )}

      {/* 3. Both in. */}
      {step === "done" && (
        <p className="mt-5 text-sm font-semibold text-ink">✓ {L("Saved. Thank you!", "已儲存，謝謝你！")}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-4">
        {step === "word" && (
          <>
            {nextBtn(L("Next word →", "下一個詞 →"))}
            <span className="footnote">{L("Don't know this one? Skip it.", "不會講這個？跳過就好。")}</span>
          </>
        )}
        {step === "sentence" && nextBtn(L("Skip to the next word →", "跳過，下一個詞 →"))}
        {step === "done" && nextBtn(L("Next word →", "下一個詞 →"), true)}
      </div>
    </section>
  );
}

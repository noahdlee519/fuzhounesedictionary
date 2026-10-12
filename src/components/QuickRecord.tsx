"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Recorder, { RECORDING_SAVED } from "./Recorder";
import RecordingTally from "./RecordingTally";
import { withdrawRecording } from "@/app/account/actions";
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
  round = 0,
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
  /** Which shuffle of the batch (?qr=): the same words in a new order, for
   *  when the filter has only one batch's worth. Pinned in the address too. */
  round?: number;
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
  const heldBatch = useRef(`${batch}.${round}`);
  // Set while a word is half done (saved, sentence not yet): a new batch
  // arriving then waits, rather than taking the card away mid-word. Belt and
  // braces for the replaceState fix below.
  const midWord = useRef(false);
  useEffect(() => {
    if (heldBatch.current === `${batch}.${round}`) return;
    if (midWord.current) return;
    heldBatch.current = `${batch}.${round}`;
    setList(words);
    setI(words.length ? start % words.length : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, round]);

  // Pin the batch in the address on arrival, so the refresh that follows a
  // save draws the same words rather than a new random set.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("qo") !== String(batch) || (round && url.searchParams.get("qr") !== String(round))) {
        url.searchParams.set("qo", String(batch));
        if (round) url.searchParams.set("qr", String(round));
        // null, not window.history.state: Next 14 treats a call that passes
        // its own state object as one of its own and does not update the
        // router's copy of the address. The pinned ?qo= then never reached
        // the refresh after a save, which drew a new random batch, and the
        // card jumped to another word just as it asked for a sentence (Noah,
        // 11 Oct 2026). With null, Next picks the new address up.
        window.history.replaceState(null, "", url);
      }
    } catch {
      /* the address just stays as it was */
    }
  }, [batch, round]);

  const word = list[i];
  const last = i + 1 >= list.length;

  // Which step of the current word: saying it, then using it, then done.
  const [step, setStep] = useState<"word" | "sentence" | "done">("word");
  midWord.current = step !== "word";
  useEffect(() => setStep("word"), [word?.id]);
  // The listener below is registered once; it reads the current word here.
  const currentWord = useRef<Word | undefined>(word);
  currentWord.current = word;

  /* The takes saved on this card, latest last, so the latest can be taken
     back from here: the card swaps its recorder out after a save, which used
     to leave no "Remove it" for a take made in Quick record. Shown on the
     sentence step and on the done step (a word with no meaning to hang a
     sentence on goes straight there). Removing the sentence goes back to the
     sentence step; removing the word goes back to the start. */
  const [saved, setSaved] = useState<{ id: string; kind: "headword" | "example" }[]>([]);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  useEffect(() => {
    setSaved([]);
    setRemoveError(null);
  }, [word?.id]);

  /* A save on the card moves it to its next step. Saves from the list below
     the card say so in their own row (with its own sentence prompt); the red
     "Thank you! Record another?" bar that used to slide in for those sat on
     top of that prompt and contradicted it (audit, 11 Oct 2026), so there is
     no bar any more. */
  useEffect(() => {
    const onSaved = (e: Event) => {
      const detail = (e as CustomEvent).detail as { kind?: string; entryId?: string; id?: string } | undefined;
      const here = currentWord.current;
      if (!here || detail?.entryId !== here.id) return;
      if (detail.kind !== "headword" && detail.kind !== "example") return;
      const kind = detail.kind;
      if (detail.id) setSaved((prev) => [...prev, { id: detail.id!, kind }]);
      setRemoveError(null);
      if (kind === "headword") setStep(here.senseId ? "sentence" : "done");
      else setStep("done");
    };
    window.addEventListener(RECORDING_SAVED, onSaved);
    return () => window.removeEventListener(RECORDING_SAVED, onSaved);
  }, []);

  const latest = saved[saved.length - 1];
  async function removeTake() {
    if (!latest || removing) return;
    setRemoving(true);
    setRemoveError(null);
    const fd = new FormData();
    fd.set("id", latest.id);
    const res = await withdrawRecording(fd).catch(() => ({ ok: false }));
    setRemoving(false);
    if (!res?.ok) {
      setRemoveError(L("Could not remove it just now. You can remove it from your account page.", "目前無法移除。你可以到帳號頁面移除。"));
      return;
    }
    setSaved((prev) => prev.slice(0, -1));
    setStep(latest.kind === "example" ? "sentence" : "word");
  }
  const removeBtn =
    latest && !isEditor ? (
      <button
        type="button"
        onClick={removeTake}
        disabled={removing}
        className="text-inkFaint underline decoration-rule underline-offset-4 transition-colors hover:text-lacquer"
      >
        {removing ? L("Removing…", "移除中…") : L("Remove it", "移除這段")}
      </button>
    ) : null;
  const removeNote = removeError ? (
    <p role="alert" className="text-sm text-lacquer">
      {removeError}
    </p>
  ) : null;

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
      window.history.replaceState(null, "", url);
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
            // No page refresh after a save: this card keeps its own list, and
            // the refresh re-ran the page, which drew a new random batch and
            // swapped the card for another word just as it asked for the
            // sentence (Noah, 11 Oct 2026). The list below catches up on the
            // next page load.
            refresh={false}
          />
        </div>
      )}

      {/* 2. The word in use: a prompt that arrives once the word is saved. */}
      {step === "sentence" && word.senseId && (
        <div className="mt-5 space-y-4">
          <div className="space-y-1">
            <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="font-semibold text-ink">✓ {L("Word saved.", "詞已儲存。")}</span>
              {removeBtn}
            </p>
            {removeNote}
            <RecordingTally userId={userId} isEditor={isEditor} />
          </div>
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
              refresh={false}
            />
          </div>
        </div>
      )}

      {/* 3. Both in. */}
      {step === "done" && (
        <div className="mt-5 space-y-1">
          <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
            <span className="font-semibold text-ink">✓ {L("Saved.", "已儲存。")}</span>
            {removeBtn}
          </p>
          {removeNote}
          <RecordingTally userId={userId} isEditor={isEditor} />
        </div>
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

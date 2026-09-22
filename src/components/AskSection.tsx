"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { holdQuestion, takeQuestion } from "@/lib/held-question";
import type { EntryCard } from "@/lib/entry-cards";
import { Answer } from "./Assistant";
import SignInButton from "./SignInButton";
import PlayButton from "./PlayButton";
import { useL } from "./LangProvider";

export interface AskStrings {
  /** The field's accessible name, since it has no visible label. */
  label: string;
  own: string;
  placeholderIn: string;
  placeholderOut: string;
  /** The placeholder on a phone, where the long one is cut off. */
  placeholderShort: string;
  note: string;
  example: string;
  signin: string;
  looking: string;
  /** Shown under a question typed while signed out. */
  gate: string;
}

export interface AskSample {
  q: string;
  a: string;
  /** A two- or three-word kicker naming the kind of question. */
  k: string;
  /** Cards for the words the written answer links to. */
  cards?: EntryCard[];
}

type Turn = {
  id: number;
  q: string;
  status: "loading" | "done" | "sample" | "error" | "limit" | "gated";
  a?: string;
  cards?: EntryCard[];
  msg?: string;
};

const MAX = 500;
const COUNT_FROM = 400;

/* The assistant as a small conversation on the home page.

   A composer (a text box that grows as you type, with its own red Ask
   button, Enter to send and Shift+Enter for a new line), four example
   questions under it, and, once something is asked, a thread: each question
   echoed, its answer in a card, and a card for every dictionary word the
   answer names, with its recording to play. Follow-ups carry the last few
   turns as history, so "and how about in a sentence?" makes sense. Loading
   shows placeholder lines in place of the answer; a failure keeps the
   question and offers Retry; the daily limit says so and does not offer it.

   Signed out, the examples show written answers (with the same word cards),
   and a question of their own is held in the browser while they sign in,
   then asked on the way back (lib/held-question). */
export default function AskSection({
  signedIn,
  samples,
  s,
}: {
  signedIn: boolean;
  samples: AskSample[];
  s: AskStrings;
}) {
  const L = useL();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const nextId = useRef(1);
  const box = useRef<HTMLTextAreaElement>(null);
  const busy = turns.some((t) => t.status === "loading");

  // Phone width: the short placeholder. Switched in an effect, since a
  // placeholder is an attribute React keeps from the server render.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Back from signing in with a question held: ask it now.
  useEffect(() => {
    if (!signedIn) return;
    const held = takeQuestion();
    if (held) {
      ask(held);
      document.getElementById("ask")?.scrollIntoView({ block: "start" });
    }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The box grows with what is typed, from two lines to about five.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
  }, [draft]);

  const patch = (id: number, p: Partial<Turn>) => setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));

  async function fetchAnswer(id: number, question: string, earlier: Turn[]) {
    // The last few answered turns, oldest first, as the conversation so far.
    const history = earlier
      .filter((t) => t.status === "done" && t.a)
      .slice(-3)
      .flatMap((t) => [
        { role: "user", content: t.q },
        { role: "assistant", content: t.a as string },
      ]);
    setStatus(L("Looking…", "查詢中…"));
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 429) {
        patch(id, { status: "limit", msg: json.message });
        setStatus(json.message ?? "");
        return;
      }
      if (!res.ok) {
        patch(id, { status: "error", msg: json.message ?? L("The assistant could not answer just now.", "助手暫時無法回答。") });
        setStatus(L("The assistant could not answer.", "助手無法回答。"));
        return;
      }
      patch(id, { status: "done", a: json.answer ?? "", cards: json.entries ?? [] });
      setStatus(L("Answer ready.", "答案出來了。"));
    } catch {
      patch(id, {
        status: "error",
        msg: L("The assistant could not be reached. Check your connection and try again.", "連不上助手。請檢查網路連線後再試一次。"),
      });
      setStatus(L("The assistant could not be reached.", "連不上助手。"));
    }
  }

  function ask(q: string) {
    const question = q.trim().slice(0, MAX);
    if (!question || busy) return;
    const id = nextId.current++;
    if (!signedIn) {
      const sample = samples.find((x) => x.q === question);
      setTurns((ts) =>
        sample
          ? [...ts, { id, q: question, status: "sample", a: sample.a, cards: sample.cards }]
          : [...ts, { id, q: question, status: "gated" }]
      );
      if (!sample) holdQuestion(question);
      return;
    }
    const earlier = turns;
    setTurns((ts) => [...ts, { id, q: question, status: "loading" }]);
    fetchAnswer(id, question, earlier);
  }

  function retry(t: Turn) {
    patch(t.id, { status: "loading", msg: undefined });
    fetchAnswer(t.id, t.q, turns.filter((x) => x.id < t.id));
  }

  function send() {
    if (!draft.trim() || busy) return;
    ask(draft);
    setDraft("");
  }

  const started = turns.length > 0;
  const placeholder = started
    ? L("Ask a follow-up", "繼續追問")
    : narrow
      ? s.placeholderShort
      : s.placeholderIn;
  const sendLabel = signedIn ? L("Ask", "提問") : L("Sign in & ask", "登入並提問");

  const composer = (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="relative"
      >
        <label className="sr-only" htmlFor="ask-own">
          {s.label}
        </label>
        <textarea
          id="ask-own"
          ref={box}
          rows={2}
          enterKeyHint="send"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={MAX}
          autoComplete="off"
          placeholder={placeholder}
          className="ui block max-h-[176px] min-h-[92px] w-full resize-none rounded-md border border-ruleStrong bg-paper py-3.5 pl-4 pr-[64px] text-[17px] leading-[1.45] tracking-[-.01em] text-ink shadow-[0_1px_0_rgb(0_0_0/.03)] outline-none transition-colors placeholder:text-inkMute focus:border-lacquer focus-visible:outline-none sm:pl-5 sm:pr-[128px]"
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          aria-label={sendLabel}
          className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-1.5 rounded-md bg-lacquer px-3 text-sm font-semibold text-lacquerInk transition-[opacity,transform,filter] hover:brightness-110 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-35 sm:px-3.5"
        >
          <span className="hidden sm:inline">{sendLabel}</span>
          <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h9.5M8.5 4l4 4-4 4" />
          </svg>
        </button>
      </form>
      <div className="mt-2 flex min-h-[18px] items-center justify-between gap-4 px-1 text-xs text-inkFaint">
        <span className={draft.length >= COUNT_FROM ? "tabular-nums" : "invisible"} aria-hidden={draft.length < COUNT_FROM}>
          {draft.length}/{MAX}
        </span>
        <span className="[@media(pointer:coarse)]:hidden">
          {L("Enter to send · Shift+Enter for a new line", "Enter 送出 · Shift+Enter 換行")}
        </span>
      </div>
    </div>
  );

  return (
    <div className="mt-6">
      {/* Announces the answer, or the trouble, to a screen reader. Always
          mounted, so the announcement is never lost to a region that
          appeared at the same moment as its text. */}
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      {started && (
        <ol className="mb-6 space-y-6">
          {turns.map((t) => (
            <li key={t.id}>
              <p className="meta text-inkFaint">{L("You asked", "你問")}</p>
              <p className="mt-1 font-display text-[19px] italic leading-snug text-ink">{t.q}</p>
              <div className="mt-3 rounded-md border border-rule bg-paper px-5 py-4 text-[17px] leading-[1.6] sm:px-6">
                {t.status === "loading" && (
                  <div aria-hidden className="space-y-2.5 py-1">
                    {["92%", "84%", "58%"].map((w) => (
                      <div key={w} className="h-3 animate-pulse rounded-full bg-rule motion-reduce:animate-none" style={{ width: w }} />
                    ))}
                  </div>
                )}
                {(t.status === "done" || t.status === "sample") && (
                  <div className="space-y-3">
                    <Answer text={t.a ?? ""} />
                    {t.cards && t.cards.length > 0 && <Cards cards={t.cards} L={L} />}
                    {t.status === "sample" && (
                      <p className="footnote">
                        {s.example}{" "}
                        <SignInButton next="/#ask" label={s.signin} className="link text-xs [&>svg]:hidden" />
                        {L(" to ask your own.", " 即可自己提問。")}
                      </p>
                    )}
                  </div>
                )}
                {t.status === "error" && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[15px] text-inkSoft">{t.msg}</p>
                    <button type="button" onClick={() => retry(t)} disabled={busy} className="btn btn-ghost btn-sm">
                      {L("Retry", "重試")}
                    </button>
                  </div>
                )}
                {t.status === "limit" && (
                  <p className="flex gap-2.5 text-[15px] text-inkSoft">
                    <svg viewBox="0 0 16 16" aria-hidden className="mt-1 h-4 w-4 shrink-0 text-amber" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="8" cy="8" r="6.5" />
                      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
                    </svg>
                    <span>{t.msg ?? L("You have reached today's limit. It resets at midnight UTC.", "今天的提問次數已用完，UTC 午夜重置。")}</span>
                  </p>
                )}
                {t.status === "gated" && (
                  <div>
                    <p className="text-[15px] text-inkSoft">{s.gate}</p>
                    <div className="mt-4">
                      <SignInButton next="/#ask" label={s.signin} className="btn btn-primary [&>svg]:hidden" />
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {composer}

      {started ? (
        <p className="mt-3 px-1">
          <button
            type="button"
            onClick={() => {
              setTurns([]);
              setStatus("");
              box.current?.focus();
            }}
            className="text-sm text-inkSoft underline decoration-rule underline-offset-4 transition-colors hover:text-lacquer"
          >
            {L("Clear and start over", "清除，重新開始")}
          </button>
        </p>
      ) : (
        <>
          <p className="footnote mt-5 px-1">{s.note}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {samples.map((x) => (
              <button
                key={x.q}
                type="button"
                onClick={() => ask(x.q)}
                className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-ruleStrong bg-paper/80 py-2 pl-3.5 pr-4 text-left text-sm text-ink transition-[border-color,background-color,transform] hover:border-lacquer hover:bg-paper active:scale-[.98]"
              >
                <span className="meta shrink-0 text-lacquer">{x.k}</span>
                <span aria-hidden className="h-3.5 w-px shrink-0 bg-rule" />
                <span>{x.q}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* A card for each dictionary word an answer names: characters, romanization,
   the first meaning, and its recording. The text opens the entry; the play
   button sits beside the link rather than inside it. */
function Cards({ cards, L }: { cards: EntryCard[]; L: ReturnType<typeof useL> }) {
  return (
    <ul className="grid gap-2 pt-1 sm:grid-cols-2" aria-label={L("Words in this answer", "答案裡的詞")}>
      {cards.map((c) => (
        <li key={c.id} className="relative flex items-center gap-3 rounded-md border border-rule bg-surface px-3.5 py-2.5 transition-colors hover:border-lacquer">
          <Link href={`/entry/${c.id}`} className="flex min-w-0 flex-1 items-baseline gap-2.5 after:absolute after:inset-0 after:content-['']">
            {c.hanzi && <span className="han shrink-0 text-[22px] font-medium leading-none text-ink">{c.hanzi}</span>}
            <span className="min-w-0">
              <span className="romanization block text-sm font-semibold leading-tight text-ink">{c.romanization}</span>
              {c.gloss && <span className="block truncate text-xs leading-snug text-inkSoft">{c.gloss}</span>}
            </span>
          </Link>
          {c.audio && (
            <span className="relative z-10 shrink-0">
              <PlayButton src={c.audio} size="xs" label={`${L("Play", "播放")} ${c.hanzi || c.romanization}`} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

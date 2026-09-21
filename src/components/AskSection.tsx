"use client";

import { useEffect, useState } from "react";
import { holdQuestion, takeQuestion } from "@/lib/held-question";
import { Answer } from "./Assistant";
import SignInButton from "./SignInButton";

export interface AskStrings {
  /** The field's accessible name, since it has no visible label. */
  label: string;
  own: string;
  placeholderIn: string;
  placeholderOut: string;
  note: string;
  example: string;
  signin: string;
  looking: string;
  /** Shown under a question typed while signed out. */
  gate: string;
}

/* The assistant as a section of the home page: a field for a question,
   three suggested questions under it, and an answer box. Signed in, a chip
   sends its question to /api/ask like the panel does; signed out, a chip
   shows a fixed example answer so the value is visible before the sign-in.

   Signed out, the field still takes a question. Asking it holds the question
   in the browser and asks for a sign-in to see the answer; back from Google,
   the page sends it straight away (lib/held-question). */
export default function AskSection({
  signedIn,
  samples,
  s,
}: {
  signedIn: boolean;
  samples: { q: string; a: string }[];
  s: AskStrings;
}) {
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // A question typed while signed out, waiting on the sign-in.
  const [gated, setGated] = useState<string | null>(null);

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

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setAsked(question);
    setNotice(null);
    setGated(null);
    if (!signedIn) {
      const sample = samples.find((x) => x.q === question);
      if (sample) {
        setAnswer(sample.a);
      } else {
        // Their own question: hold it and ask them to sign in for the answer.
        setAnswer(null);
        holdQuestion(question);
        setGated(question);
      }
      return;
    }
    setBusy(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, history: [] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(json.message ?? "The assistant could not answer just now.");
        return;
      }
      setAnswer(json.answer ?? "");
    } catch {
      setNotice("The assistant could not be reached. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  /* The field comes first, the size of the search box, and the suggested
     questions sit under it as a way in for someone who does not know what
     to ask. No "Ask your own" heading over the field: the field is the
     obvious thing, and the heading only put a label between the section
     title and it. */
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
          setDraft("");
        }}
        className="mt-6"
      >
        <label className="sr-only" htmlFor="ask-own">
          {s.label}
        </label>
        <input
          id="ask-own"
          enterKeyHint="send"
          className="ui h-14 w-full min-w-0 rounded-sm border border-ink bg-paper px-5 text-[17px] tracking-[-.01em] text-ink outline-none transition-colors placeholder:text-inkMute focus:border-lacquer focus-visible:outline-none disabled:cursor-not-allowed disabled:border-ruleStrong disabled:bg-surface2"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          maxLength={500}
          autoComplete="off"
          placeholder={s.placeholderIn}
        />
      </form>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {samples.map((x) => (
          <button
            key={x.q}
            type="button"
            onClick={() => ask(x.q)}
            aria-pressed={asked === x.q}
            className={
              "min-h-[44px] rounded-sm border bg-paper px-4 py-2.5 text-left text-sm transition-colors " +
              (asked === x.q ? "border-ink" : "border-ruleStrong hover:border-inkMute")
            }
          >
            {x.q}
          </button>
        ))}
      </div>

      {gated && (
        <div className="mt-6 rounded-sm border border-rule bg-paper px-[22px] py-5" aria-live="polite">
          <p className="text-[17px] font-semibold text-ink">{gated}</p>
          <p className="mt-2 text-inkSoft">{s.gate}</p>
          <div className="mt-4">
            <SignInButton next="/#ask" label={s.signin} className="btn btn-primary [&>svg]:hidden" />
          </div>
        </div>
      )}

      {(busy || answer || notice) && (
        <div className="mt-6 rounded-sm border border-rule bg-paper px-[22px] py-5 text-[17px] leading-[1.55]" aria-live="polite">
          {busy && (
            <p className="flex items-center gap-2.5 text-inkSoft">
              <span className="spinner text-lacquer" aria-hidden />
              {s.looking}
            </p>
          )}
          {notice && <p className="text-lacquer">{notice}</p>}
          {answer && (
            <div className="space-y-2">
              <Answer text={answer} />
              {!signedIn && (
                <p className="footnote">
                  {s.example}{" "}
                  <SignInButton next="/#ask" label={s.signin} className="link text-xs [&>svg]:hidden" /> {s.own.toLowerCase()}.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="footnote mt-4">{s.note}</p>
    </div>
  );
}

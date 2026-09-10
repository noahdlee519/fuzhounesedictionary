"use client";

import { useState } from "react";
import { Answer } from "./Assistant";
import SignInButton from "./SignInButton";

export interface AskStrings {
  own: string;
  placeholderIn: string;
  placeholderOut: string;
  note: string;
  btn: string;
  example: string;
  signin: string;
  looking: string;
}

/* The assistant as a section of the home page: three question chips, an
   answer box, and a field for a question of your own. Signed in, a chip
   sends its question to /api/ask like the panel does; signed out, a chip
   shows a fixed example answer so the value is visible before the sign-in,
   and the field is disabled. */
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

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setAsked(question);
    setNotice(null);
    if (!signedIn) {
      const sample = samples.find((x) => x.q === question);
      setAnswer(sample ? sample.a : null);
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

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-2.5">
        {samples.map((x) => (
          <button
            key={x.q}
            type="button"
            onClick={() => ask(x.q)}
            aria-pressed={asked === x.q}
            className={
              "min-h-[44px] rounded-full border px-4 py-2.5 text-left text-sm transition-colors " +
              (asked === x.q ? "border-ink" : "border-ruleStrong hover:border-inkMute")
            }
          >
            {x.q}
          </button>
        ))}
      </div>

      {(busy || answer || notice) && (
        <div className="mt-6 rounded-xl bg-surface px-[22px] py-5 text-[17px] leading-[1.55]" aria-live="polite">
          {busy && <p className="text-inkSoft">{s.looking}</p>}
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
          setDraft("");
        }}
        className="mt-6 max-w-[640px]"
      >
        <label className="field-label" htmlFor="ask-own">
          {s.own}
        </label>
        <input
          id="ask-own"
          className="field-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!signedIn || busy}
          maxLength={500}
          autoComplete="off"
          placeholder={signedIn ? s.placeholderIn : s.placeholderOut}
        />
        {signedIn ? (
          <div className="mt-4">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !draft.trim()}>
              {s.btn}
            </button>
          </div>
        ) : (
          <p className="footnote mt-3">
            <SignInButton next="/#ask" label={s.signin} className="link text-xs [&>svg]:hidden" />
            {" · "}
            {s.note}
          </p>
        )}
      </form>
    </div>
  );
}

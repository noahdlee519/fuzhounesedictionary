"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SignInButton from "./SignInButton";

/* "Ask the dictionary" — the panel under the search bar.

   A short exchange with an assistant that answers only from this dictionary
   (see src/lib/assistant.ts for the rules it is held to). Nothing here is
   clever: the panel keeps the conversation in memory, posts each question to
   /api/ask with the last few turns, and renders the reply. Links in the reply
   are only ever to pages on this site. */

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = ["How do you say house?", "What is a measure word?", "Which words are from Changle?"];

export default function Assistant({ open, signedIn }: { open: boolean; signedIn: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);

  if (!open) return null;

  if (!signedIn) {
    return (
      <section aria-label="Ask the dictionary" className="page-fade space-y-3 border border-rule bg-surface p-5">
        <p className="text-sm text-inkSoft">
          Ask about a word, a meaning or how the language works. Answers come from this dictionary and
          its learn page; where the dictionary falls short it says so and marks any guess as a guess.
          Sign in to use it—each account gets a small daily share, so the cost stays sane.
        </p>
        <SignInButton next="/" label="Sign in with Google" />
      </section>
    );
  }

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setNotice(null);
    setDraft("");
    const history = turns.slice(-6);
    setTurns((t) => [...t, { role: "user", content: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(json.message ?? "The assistant could not answer just now.");
        setTurns((t) => t.slice(0, -1));
        setDraft(q);
        return;
      }
      setTurns((t) => [...t, { role: "assistant", content: json.answer ?? "" }]);
    } catch {
      setNotice("The assistant could not be reached. Check your connection and try again.");
      setTurns((t) => t.slice(0, -1));
      setDraft(q);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section
      aria-label="Ask the dictionary"
      className="page-fade border border-rule bg-surface"
    >
      <div className="max-h-[50vh] space-y-4 overflow-y-auto p-5">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-inkSoft">
              Ask about a word, a meaning or how the language works. Answers come from this
              dictionary and its learn page; where the dictionary falls short it says so and marks
              any guess as a guess. It does not translate sentences.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="border border-rule px-2.5 py-1 text-[13px] text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) =>
          t.role === "user" ? (
            <p key={i} className="font-display font-semibold text-ink">
              {t.content}
            </p>
          ) : (
            <div key={i} className="space-y-2 border-l-2 border-lacquer pl-4 text-inkSoft">
              <Answer text={t.content} />
            </div>
          )
        )}

        {busy && (
          <p aria-live="polite" className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
            Looking…
          </p>
        )}
        {notice && (
          <p role="alert" className="text-sm text-lacquer">
            {notice}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex border-t border-rule"
      >
        <label htmlFor="ask-input" className="sr-only">
          Your question
        </label>
        <input
          id="ask-input"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Ask the dictionary…"
          autoComplete="off"
          className="w-full bg-transparent px-5 py-3 outline-none placeholder:text-inkFaint"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="shrink-0 border-l border-rule px-5 font-mono text-xs uppercase tracking-[0.1em] text-inkSoft transition-colors hover:text-lacquer disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </section>
  );
}

/* The reply is plain text with [label](/path) links to entries and pages on
   this site. Paragraphs split on blank lines; anything else is shown as
   written. External links are not followed — they are rendered as text. */
function Answer({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="leading-relaxed">
          {linkify(p)}
        </p>
      ))}
    </>
  );
}

function linkify(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // "/x" and nothing else: a protocol-relative "//host" would leave the site.
  const re = /\[([^\]]+)\]\((\/(?!\/)[^\s)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(
      <Link key={k++} href={m[2]} className="font-medium text-lacquer hover:underline">
        {m[1]}
      </Link>
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

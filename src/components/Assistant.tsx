"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SignInButton from "./SignInButton";

/* "Ask the dictionary" — the panel under the search bar.

   A short exchange with an assistant that answers only from this dictionary
   (see src/lib/assistant.ts for the rules it is held to). Nothing here is
   clever: the panel keeps the conversation in sessionStorage (so it survives
   moving between pages, and ends with the tab), posts each question to
   /api/ask with the last few turns, and renders the reply. Links in the reply
   are only ever to pages on this site. */

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = ["How do you say house?", "What is a measure word?", "Which words are from Changle?"];

/* Shown to signed-out visitors in place of a live answer. Kept to things the
   dictionary is sure of. */
export const SAMPLES = [
  {
    q: "How do you say house?",
    a: "厝 chuó is the everyday word for a house or home. The entry has recordings you can play, and a note from a speaker on how they use it.",
  },
  {
    q: "Does 八 only mean eight?",
    a: "No. 八 báik is the number eight, and a separate entry 八 báik is the verb to know or recognise, as in a speaker's note \u201cI already know\u201d. Search results show which meaning matched.",
  },
  {
    q: "Which words are from Changle?",
    a: "Every word and recording carries where its contributor's Fuzhounese is from. The Browse page can be filtered to Changle 長樂, and each entry page names the district beside each recording.",
  },
];

/* One conversation per browser tab. Kept small (the last 40 turns) and read
   inside try/catch: private windows and some embedded views throw on access. */
const STORE = "ask-history";
const KEEP = 40;
function loadTurns(): Turn[] {
  try {
    const raw = sessionStorage.getItem(STORE);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v)
      ? v.filter((t) => (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string")
      : [];
  } catch {
    return [];
  }
}
function storeTurns(turns: Turn[]) {
  try {
    if (turns.length) sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-KEEP)));
    else sessionStorage.removeItem(STORE);
  } catch {
    /* storage unavailable: the panel still works for this page view */
  }
}

export default function Assistant({ open, signedIn }: { open: boolean; signedIn: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Save on every change — but not before the restore below has run, or the
  // empty first render would wipe the stored conversation. Effects run in
  // declaration order, so this one sees loaded=false on the mount pass.
  useEffect(() => {
    if (loaded.current) storeTurns(turns);
  }, [turns]);
  // Restore after mount, not in useState's initialiser: the server renders an
  // empty panel and the two must agree at hydration.
  useEffect(() => {
    setTurns(loadTurns());
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);

  if (!open) return null;

  if (!signedIn) {
    return (
      <section aria-label="Ask the dictionary" className="page-fade space-y-4 border border-rule bg-surface p-5">
        <p className="text-sm text-inkSoft">
          Ask about a word, a meaning or how the language works. Answers come from the dictionary
          itself, so it is only as good as the entries. It is not a perfect tool and has limitations,
          especially with translating sentences.
        </p>
        {/* Two exchanges of the kind it handles, so the value shows before the
            sign-in. Fixed text, not live answers. */}
        <div className="space-y-3 border-l-2 border-rule pl-4">
          {SAMPLES.map((ex) => (
            <div key={ex.q} className="space-y-1">
              <p className="font-display font-semibold text-ink">{ex.q}</p>
              <p className="text-sm leading-relaxed text-inkSoft">{ex.a}</p>
            </div>
          ))}
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">Example answers</p>
        </div>
        <p className="text-sm text-inkSoft">
          Sign in to ask your own.
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
      <div className="max-h-[50vh] space-y-4 overflow-y-auto px-5 pt-5 pb-4">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-inkSoft">
              Ask about a word, a meaning or how the language works. Answers come from data
              composing the dictionary. It is not a perfect tool and has limitations, especially
              with translating sentences.
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

        {turns.length > 0 && !busy && (
          <p className="!mt-2 text-right">
            <button
              type="button"
              onClick={() => {
                setTurns([]);
                setNotice(null);
              }}
              className="font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint transition-colors hover:text-lacquer"
            >
              Clear conversation
            </button>
          </p>
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
        {/* scroll anchor; !mt-0 keeps it out of the space-y rhythm, or it adds
            a blank 16px under whatever is last */}
        <div ref={endRef} className="!mt-0" />
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
          // pt/pb split by a pixel: the serif sits high in the box otherwise.
          className="w-full bg-transparent px-5 pt-[13px] pb-[11px] outline-none placeholder:text-inkFaint"
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
export function Answer({ text }: { text: string }) {
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

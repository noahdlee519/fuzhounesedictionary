"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SignInButton from "./SignInButton";
import { holdQuestion, takeQuestion } from "@/lib/held-question";

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

const STARTERS = ["What does “chia” mean in English?", "What is a measure word?", "Which words are from Changle?"];

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

export default function Assistant({
  open,
  signedIn,
  onHeld,
}: {
  open: boolean;
  signedIn: boolean;
  /** Called when a question held from before a sign-in is about to be asked. */
  onHeld?: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  // A question typed while signed out, waiting on the sign-in.
  const [gated, setGated] = useState<string | null>(null);
  // Phone width: a placeholder short enough not to be cut off.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // A question held from before a sign-in, to send once history is restored.
  const [held, setHeld] = useState<string | null>(null);

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
    if (signedIn) {
      const q = takeQuestion();
      if (q) {
        setHeld(q);
        onHeld?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);

  // Runs after the restore above has landed, so the question goes out with
  // the conversation it belongs to.
  useEffect(() => {
    if (!held) return;
    setHeld(null);
    send(held);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [held]);

  if (!open) return null;

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setNotice(null);
    setDraft("");
    /* Signed out: the question is held in the browser, and the panel asks
       for a sign-in to see the answer. Back from Google, it is sent on
       arrival (below). */
    if (!signedIn) {
      holdQuestion(q);
      setGated(q);
      return;
    }
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

  /* The same shape as the home page's Ask section: the field first, the
     size of the search box, with suggested questions as boxes under it and
     the conversation below those. No paragraph of explanation — one line
     under it says where the answers come from. */
  const talking = turns.length > 0 || gated || busy || notice;
  return (
    <section aria-label="Ask the dictionary" className="page-fade rounded-sm bg-surface p-5 sm:p-7">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor="ask-input" className="sr-only">
          Ask the assistant
        </label>
        <input
          id="ask-input"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder={narrow ? "Ask any question" : "Ask anything—e.g. how do I say “I love eating dingbianhu”?"}
          autoComplete="off"
          disabled={busy}
          className="ui h-14 w-full min-w-0 rounded-sm border border-ink bg-paper px-5 text-[17px] tracking-[-.01em] text-ink outline-none transition-colors placeholder:text-inkMute focus:border-lacquer focus-visible:outline-none disabled:cursor-not-allowed"
          enterKeyHint="send"
        />
      </form>

      {turns.length === 0 && !gated && (
        <>
        <p className="footnote mt-5">Try an example query</p>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {STARTERS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="min-h-[44px] rounded-sm border border-ruleStrong bg-paper px-4 py-2.5 text-left text-sm transition-colors hover:border-inkMute"
            >
              {q}
            </button>
          ))}
        </div>
        </>
      )}

      {talking && (
        <div
          aria-live="polite"
          className="mt-6 max-h-[50vh] space-y-4 overflow-y-auto rounded-sm border border-rule bg-paper px-[22px] py-5 text-[17px] leading-[1.55]"
        >
          {turns.map((t, i) =>
            t.role === "user" ? (
              <p key={i} className="font-semibold text-ink">
                {t.content}
              </p>
            ) : (
              <div key={i} className="space-y-2 border-l-2 border-lacquer pl-4 text-inkSoft">
                <Answer text={t.content} />
              </div>
            )
          )}

          {gated && (
            <div className="space-y-2">
              <p className="font-semibold text-ink">{gated}</p>
              <p className="text-inkSoft">Sign in to see the answer. Your question will be asked as soon as you are back.</p>
              <div className="pt-2">
                <SignInButton
                  next={typeof window === "undefined" ? "/" : window.location.pathname + window.location.search}
                  label="Sign in"
                  className="btn btn-primary [&>svg]:hidden"
                />
              </div>
            </div>
          )}

          {busy && (
            <p className="flex items-center gap-2.5 text-inkSoft">
              <span className="spinner text-lacquer" aria-hidden />
              Looking…
            </p>
          )}
          {notice && (
            <p role="alert" className="text-lacquer">
              {notice}
            </p>
          )}
          {/* scroll anchor; !mt-0 keeps it out of the space-y rhythm */}
          <div ref={endRef} className="!mt-0" />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
        {turns.length > 0 && !busy && (
          <button
            type="button"
            onClick={() => {
              setTurns([]);
              setNotice(null);
            }}
            className="footnote transition-colors hover:text-lacquer"
          >
            Clear conversation
          </button>
        )}
      </div>
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

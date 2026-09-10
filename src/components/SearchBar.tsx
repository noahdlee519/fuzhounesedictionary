"use client";

import { useEffect, useState } from "react";
import Assistant from "./Assistant";

/* The big search box: a 56px field with a magnifier inside it and no button
   — Enter (or the keyboard's Search key) submits. A line beneath says how
   large the dictionary is and what to try. Optionally a small "Ask the
   assistant" button that unfolds the assistant panel under the box. */

const FULL = "Type English, 漢字, or romanization—e.g. eat, 食, siah";
const SHORT = "English, 漢字 or romanization";

const NARROW = "(max-width: 639px)";

export function Magnifier({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function SearchBar({
  defaultValue = "",
  signedIn = false,
  focus = true,
  assistant = false,
  id = "site-search",
  hint,
  after,
  placeholderFull = FULL,
  placeholderShort = SHORT,
  label = "Search the dictionary",
}: {
  defaultValue?: string;
  signedIn?: boolean;
  /** Focus the box on arrival (the home page). Off where the box is one
   *  thing among many, as on the word list. */
  focus?: boolean;
  /** Show a small "Ask the assistant" button that unfolds the panel. */
  assistant?: boolean;
  /** Element id, so two boxes on one page never share one. */
  id?: string;
  /** A line under the box: how many entries, what to try. */
  hint?: React.ReactNode;
  /** Something at the right end of that line — a link to the assistant. */
  after?: React.ReactNode;
  placeholderFull?: string;
  placeholderShort?: string;
  label?: string;
}) {
  // autoFocus is acted on when the element mounts, so it has to be right on
  // the very first client render — an effect is too late, and the phone
  // keyboard had already opened on every visit. React never renders autoFocus
  // as an attribute, so a server/client difference here is harmless.
  const [focusOnMount] = useState(
    () => focus && !(typeof window !== "undefined" && window.matchMedia(NARROW).matches)
  );

  // The placeholder IS an attribute, and React does not patch attributes that
  // differ between server and client, so this one starts as the server
  // rendered it and is switched in an effect.
  const [narrow, setNarrow] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div>
      <form action="/" method="get" role="search" className="relative">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <Magnifier className="pointer-events-none absolute left-[18px] top-1/2 h-4 w-4 -translate-y-1/2 opacity-45" />
        <input
          id={id}
          type="search"
          name="q"
          autoComplete="off"
          defaultValue={defaultValue}
          autoFocus={focusOnMount}
          placeholder={narrow ? placeholderShort : placeholderFull}
          className="h-14 w-full rounded-xl border border-ruleStrong bg-surface pl-[46px] pr-5 text-[17px] tracking-[-.01em] text-ink outline-none transition-colors placeholder:text-inkMute focus:border-lacquer focus:bg-paper focus-visible:outline-none"
        />
      </form>

      {(hint || assistant || after) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
          {hint ? <p className="footnote">{hint}</p> : <span />}
          {after}
          {assistant && (
            <button
              type="button"
              onClick={() => setAskOpen((o) => !o)}
              aria-expanded={askOpen}
              aria-controls={`${id}-ask`}
              className={"btn btn-sm " + (askOpen ? "btn-primary" : "btn-ghost")}
            >
              Ask the assistant
              <span aria-hidden className={"text-[10px] transition-transform " + (askOpen ? "rotate-90" : "")}>
                &#9656;
              </span>
            </button>
          )}
        </div>
      )}
      {assistant && (
        <div id={`${id}-ask`} className={askOpen ? "mt-4" : ""}>
          <Assistant open={askOpen} signedIn={signedIn} />
        </div>
      )}
    </div>
  );
}

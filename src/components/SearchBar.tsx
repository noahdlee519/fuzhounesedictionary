"use client";

import { useEffect, useState } from "react";
import Assistant from "./Assistant";

const FULL = "Search for characters, romanizations, English or Chinese";
const SHORT = "Search a word…";

const NARROW = "(max-width: 639px)";

export default function SearchBar({
  defaultValue = "",
  signedIn = false,
  focus = true,
  assistant = true,
  id = "site-search",
}: {
  defaultValue?: string;
  signedIn?: boolean;
  /** Focus the box on arrival (the home page). Off where the box is one
   *  thing among many, as on the word list. */
  focus?: boolean;
  /** Show the assistant button and panel. Off outside the home page. */
  assistant?: boolean;
  /** Element id, so two boxes on one page never share one. */
  id?: string;
}) {
  // Two reads of the same media query, for two different reasons.
  //
  // autoFocus is acted on when the element mounts, so it has to be right on
  // the very first client render — an effect is too late, and the phone
  // keyboard had already opened on every visit. React never renders autoFocus
  // as an attribute, so a server/client difference here is harmless.
  const [focusOnMount] = useState(
    () => focus && !(typeof window !== "undefined" && window.matchMedia(NARROW).matches)
  );

  // The placeholder IS an attribute, and React does not patch attributes that
  // differ between server and client. Initialising it from the window meant
  // phones hydrated against the long server string and, since the state
  // already held `true`, the effect's setState was a no-op — the short text
  // never appeared. So this one starts as the server rendered it and is
  // switched in an effect.
  const [narrow, setNarrow] = useState(false);

  // "Ask the dictionary" — the sparkle button at the end of the box opens a
  // panel underneath. Closed on every visit; nothing is remembered.
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="space-y-3">
    <form
      action="/"
      method="get"
      className="flex border-2 border-ruleStrong bg-surface focus-within:border-lacquer"
    >
      <label htmlFor={id} className="sr-only">
        Search the dictionary
      </label>
      <input
        id={id}
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus={focusOnMount}
        placeholder={narrow ? SHORT : FULL}
        className="w-full bg-transparent px-5 pt-[18px] pb-[14px] text-lg leading-none outline-none placeholder:text-inkFaint"
      />
      {/* The sparkle button, with a hover hint beneath it. A styled tooltip
          rather than a title attribute: it appears at once instead of after
          the browser's delay, and reads the same in every browser. Hidden
          once the panel is open — the hint has done its job. */}
      {assistant && (
      <span className="group relative grid shrink-0">
        <button
          type="button"
          onClick={() => setAskOpen((o) => !o)}
          aria-pressed={askOpen}
          aria-controls="ask-panel"
          aria-label="Ask the dictionary"
          aria-describedby={askOpen ? undefined : "ask-hint"}
          className={
            "grid h-full place-items-center px-3 transition-colors hover:text-lacquer " +
            (askOpen ? "text-lacquer" : "text-inkFaint")
          }
        >
          <SparkleSearch />
        </button>
        {!askOpen && (
          <span
            id="ask-hint"
            role="tooltip"
            className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap border border-rule bg-paper px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-inkSoft opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
          >
            Try the Fuzhounese search assistant
          </span>
        )}
      </span>
      )}
      <button
        type="submit"
        className="shrink-0 bg-lacquer px-7 font-display font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-90"
      >
        Search
      </button>
    </form>
    {assistant && (
      <div id="ask-panel">
        <Assistant open={askOpen} signedIn={signedIn} />
      </div>
    )}
    </div>
  );
}

/* A magnifying glass with two four-point sparkles at its top right. */
function SparkleSearch() {
  const star = (cx: number, cy: number, r: number) =>
    `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;
  return (
    <svg width="24" height="22" viewBox="0 0 26 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10" cy="12" r="6.5" />
        <path d="M15 17l5.5 5.5" />
      </g>
      <g fill="currentColor">
        <path d={star(19.5, 5, 4)} />
        <path d={star(24, 11, 2)} />
      </g>
    </svg>
  );
}

"use client";

import { useEffect, useState } from "react";
import Assistant from "./Assistant";

// Noah's wording, 9 Sep 2026. Short enough for every width.
const FULL = "Search for words or users...";
const SHORT = "Search for words or users...";

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

  // "Ask the dictionary" — a button under the box opens a panel beneath it.
  // Closed on every visit; nothing is remembered.
  const [askOpen, setAskOpen] = useState(false);
  const toggleAsk = () => setAskOpen((o) => !o);

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
        autoComplete="off"
        defaultValue={defaultValue}
        autoFocus={focusOnMount}
        placeholder={narrow ? SHORT : FULL}
        className="w-full bg-transparent px-5 pt-[17px] pb-[15px] text-lg leading-none outline-none placeholder:text-inkFaint"
      />
      <button
        type="submit"
        // Hidden on a phone: the keyboard's own Search/Go key submits the form.
        className="hidden shrink-0 bg-lacquer px-7 font-display font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-90 sm:block"
      >
        Search
      </button>
    </form>
    {assistant && (
      <div className="mt-2">
        {/* The same fold-out idiom as the Origin filter on /learn: a small
            mono label with a triangle that turns when open. */}
        <button
          type="button"
          onClick={toggleAsk}
          aria-expanded={askOpen}
          aria-controls={`${id}-ask`}
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint transition-colors hover:text-lacquer"
        >
          Ask the Fuzhounese search assistant
          <span aria-hidden className={"text-[10px] transition-transform " + (askOpen ? "rotate-90" : "")}>
            &#9656;
          </span>
        </button>
        <div id={`${id}-ask`} className={askOpen ? "mt-3" : ""}>
          <Assistant open={askOpen} signedIn={signedIn} />
        </div>
      </div>
    )}
    </div>
  );
}

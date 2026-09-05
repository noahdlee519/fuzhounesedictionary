"use client";

import { useEffect, useState } from "react";

const FULL = "Search for characters, romanizations, English or Chinese";
const SHORT = "Search a word…";

const NARROW = "(max-width: 639px)";

export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  // Two reads of the same media query, for two different reasons.
  //
  // autoFocus is acted on when the element mounts, so it has to be right on
  // the very first client render — an effect is too late, and the phone
  // keyboard had already opened on every visit. React never renders autoFocus
  // as an attribute, so a server/client difference here is harmless.
  const [focusOnMount] = useState(
    () => !(typeof window !== "undefined" && window.matchMedia(NARROW).matches)
  );

  // The placeholder IS an attribute, and React does not patch attributes that
  // differ between server and client. Initialising it from the window meant
  // phones hydrated against the long server string and, since the state
  // already held `true`, the effect's setState was a no-op — the short text
  // never appeared. So this one starts as the server rendered it and is
  // switched in an effect.
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <form
      action="/"
      method="get"
      className="flex border-2 border-ruleStrong bg-surface focus-within:border-lacquer"
    >
      <label htmlFor="site-search" className="sr-only">
        Search the dictionary
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus={focusOnMount}
        placeholder={narrow ? SHORT : FULL}
        className="w-full bg-transparent px-5 pt-[18px] pb-[14px] text-lg leading-none outline-none placeholder:text-inkFaint"
      />
      <button
        type="submit"
        className="shrink-0 bg-lacquer px-7 font-display font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}

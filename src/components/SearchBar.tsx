"use client";

import { useEffect, useState } from "react";

const FULL = "Search for characters, romanizations, English or Chinese";
const SHORT = "Search a word…";

export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  // Read the media query on first render, not in an effect: autoFocus is
  // acted on at mount, so a value that only becomes right afterwards is too
  // late — the phone keyboard had already opened on every visit.
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
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
        autoFocus={!narrow}
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

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/* The search pill in the header, on every page but the home page and
   Browse, which both have the big search box right under the header. A plain
   GET form to "/", so it works before any JavaScript loads and lands on the
   same results page as the big box on the home page. A second box up here
   only repeated the one on those two pages. */
export default function HeaderSearch({
  className = "",
  placeholder = "Search for a word",
  placeholderShort = "Search",
  label = "Search the dictionary",
}: {
  className?: string;
  placeholder?: string;
  /** On a phone the pill shares the top line with the wordmark and the
   *  domain, and the full placeholder would be cut off mid-word. */
  placeholderShort?: string;
  label?: string;
}) {
  const path = usePathname();
  // Switched in an effect: the placeholder is an attribute, and React keeps
  // the server's value for an attribute that differs at hydration.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 559px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  if (path === "/" || path === "/browse") return null;
  return (
    <form action="/" method="get" role="search" className={`relative ${className}`}>
      <label htmlFor="header-q" className="sr-only">
        {label}
      </label>
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-[13px] w-[13px] -translate-y-1/2 opacity-45"
      >
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        id="header-q"
        type="search"
        name="q"
        autoComplete="off"
        placeholder={narrow ? placeholderShort : placeholder}
        aria-label={label}
        className="ui h-[34px] w-full rounded-sm border border-ruleStrong bg-paper pl-8 pr-3.5 text-sm tracking-[-.01em] text-ink outline-none transition-colors placeholder:text-inkMute focus:border-ruleStrong focus:bg-paper focus-visible:outline-none"
      />
    </form>
  );
}

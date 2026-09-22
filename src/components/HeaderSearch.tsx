"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/* The search pill in the header. A plain GET form to "/", so it works
   before any JavaScript loads and lands on the same results page as the big
   box on the home page.

   The home page and Browse have that big box near the top, and a second one
   up here would only repeat it. So there the pill is hidden until the big
   box has scrolled up under the header, fades in, and fades out again when
   it comes back into view. Hidden means invisible and unreachable (no
   pointer, not in the tab order), but still holding its place, so nothing
   in the header moves when it appears. */
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
    const mq = window.matchMedia("(max-width: 899px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // Only on the two pages with the big box; everywhere else it just shows.
  const hasBigBox = path === "/" || path === "/browse";
  const [shown, setShown] = useState(!hasBigBox);
  useEffect(() => {
    if (!hasBigBox) {
      setShown(true);
      return;
    }
    const big = document.getElementById(path === "/browse" ? "browse-search" : "site-search");
    const header = document.querySelector("header");
    if (!big) {
      setShown(true);
      return;
    }
    let frame = 0;
    const check = () => {
      frame = 0;
      const line = header ? header.getBoundingClientRect().bottom : 0;
      setShown(big.getBoundingClientRect().bottom < line);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [hasBigBox, path]);

  return (
    <form
      action="/"
      method="get"
      role="search"
      aria-hidden={!shown || undefined}
      className={`relative transition-[opacity,visibility] duration-200 ease-out ${shown ? "visible opacity-100" : "invisible opacity-0"} ${className}`}
    >
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
        className="ui h-[34px] w-full text-ellipsis rounded-sm border border-ruleStrong bg-paper pl-8 pr-2 text-sm sm:pr-3.5 tracking-[-.01em] text-ink outline-none transition-colors placeholder:text-inkMute focus:border-ruleStrong focus:bg-paper focus-visible:outline-none"
      />
    </form>
  );
}

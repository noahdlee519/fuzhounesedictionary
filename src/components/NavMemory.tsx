"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/* Remembers, for this tab only, whether you have moved around inside the site
   since the document loaded.

   BackLink used to decide that from document.referrer, which the browser only
   sets on a full page load. Next's own navigation replaces the page without
   reloading the document, so after clicking a word on /learn the referrer is
   still whatever loaded /learn — usually nothing — and the Back link gave up
   and offered the home page instead of the place you were just reading.

   A counter of in-tab navigations is the missing signal. It resets on every
   fresh document, so a visitor who lands straight on an entry from Google
   still gets the fixed fallback. */

export const NAV_DEPTH_KEY = "nav-depth";

/** How many in-tab navigations have happened since this document loaded. */
export function navDepth(): number {
  try {
    return Number(sessionStorage.getItem(NAV_DEPTH_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

export default function NavMemory() {
  const pathname = usePathname();
  const loaded = useRef(false);

  useEffect(() => {
    try {
      if (!loaded.current) {
        loaded.current = true;
        sessionStorage.setItem(NAV_DEPTH_KEY, "0");
        return;
      }
      sessionStorage.setItem(NAV_DEPTH_KEY, String(navDepth() + 1));
    } catch {
      /* Private browsing with storage blocked: the referrer test still works
         for anyone who arrived by a full page load. */
    }
  }, [pathname]);

  return null;
}

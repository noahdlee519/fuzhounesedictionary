"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/* Remembers, for this tab only, how you got to the page you are on.

   BackLink used to decide that from document.referrer, which the browser only
   sets on a full page load. Next's own navigation replaces the page without
   reloading the document, so the referrer goes stale: after clicking a word on
   /learn it is still whatever loaded the tab in the first place. Worse, if the
   tab was first loaded from an editor page, every word page for the rest of
   the tab's life fell back to "Back to search", including one reached from the
   review queue or from Basic lessons (Noah, 22 Sep 2026).

   So this keeps three things in sessionStorage, which is per tab:
   - nav-depth: how many in-tab navigations since the document loaded (reset
     on every fresh document, so a visitor straight from Google still gets the
     fixed fallback);
   - nav-prev: the page you were on one navigation ago, path and query;
   - nav-zone: the data-back-zone of the part of the page a link was clicked
     in, so "Back" can name the section you came from (Learn's Basic lessons
     is data-back-zone="lessons"). */

export const NAV_DEPTH_KEY = "nav-depth";
const PREV_KEY = "nav-prev";
const ZONE_KEY = "nav-zone";
const PENDING_ZONE_KEY = "nav-zone-pending";

const read = (k: string) => {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* Storage blocked: BackLink falls back to the referrer, then the fixed link. */
  }
};

/** How many in-tab navigations have happened since this document loaded. */
export function navDepth(): number {
  return Number(read(NAV_DEPTH_KEY) ?? "0") || 0;
}

/** The page this one was reached from inside the tab, and the zone of the
 *  link that was clicked there, or null after a fresh load. */
export function navFrom(): { path: string; zone: string } | null {
  const path = read(PREV_KEY);
  return path ? { path, zone: read(ZONE_KEY) ?? "" } : null;
}

export default function NavMemory() {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? "";
  const here = pathname + (search ? `?${search}` : "");
  const last = useRef<string | null>(null);

  // Which zone a link was clicked in. Capture phase, so it is written before
  // Next starts the navigation.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a) return;
      const zone = a.closest<HTMLElement>("[data-back-zone]")?.dataset.backZone ?? "";
      write(PENDING_ZONE_KEY, zone);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (last.current === null) {
      // A fresh document: nothing in this tab to go back to yet.
      last.current = here;
      write(NAV_DEPTH_KEY, "0");
      write(PREV_KEY, "");
      write(ZONE_KEY, "");
      write(PENDING_ZONE_KEY, "");
      return;
    }
    if (last.current === here) return;
    // Only a change of page counts: a query tidied by replaceState on the same
    // path (Learn's ?tab=, a dismissed ?saved=) is not somewhere to go back to.
    const samePage = last.current.split("?")[0] === pathname;
    if (!samePage) {
      write(NAV_DEPTH_KEY, String(navDepth() + 1));
      write(PREV_KEY, last.current);
      write(ZONE_KEY, read(PENDING_ZONE_KEY) ?? "");
    }
    write(PENDING_ZONE_KEY, "");
    last.current = here;
  }, [here, pathname]);

  return null;
}

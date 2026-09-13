"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { navDepth } from "./NavMemory";

/* "← Back" that returns you to where you actually were.

   If you arrived from another page on this site — page 4 of the word list,
   or the lesson you were halfway down — the browser's own history has your
   scroll position, so going back through it puts you exactly where you left
   off. If you arrived from elsewhere (a search engine, a shared link), there
   is nothing to go back to, and the link falls back to a fixed destination.

   Two ways of telling those apart, because neither covers both cases: a
   same-site document.referrer catches a full page load, and NavMemory's
   counter catches Next's own in-tab navigation, which leaves the referrer
   untouched. The decision is made after mount, so the server renders the
   fallback and the link is never broken. */
export default function BackLink({
  fallback,
  fallbackLabel,
  className,
}: {
  fallback: string;
  fallbackLabel: string;
  className?: string;
}) {
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    try {
      const ref = document.referrer;
      const sameSite = Boolean(ref) && ref.startsWith(window.location.origin);
      // Arriving from an editor page (after Save, say) is not a place worth
      // returning to; offer the fixed destination instead.
      const fromEditor = sameSite && new URL(ref).pathname.startsWith("/admin");
      const movedInTab = navDepth() > 0;
      setCanGoBack((sameSite || movedInTab) && !fromEditor && window.history.length > 1);
    } catch {
      setCanGoBack(false);
    }
  }, []);

  if (!canGoBack) {
    return (
      <Link href={fallback} className={className}>
        {fallbackLabel}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => window.history.back()} className={className}>
      ← Back
    </button>
  );
}

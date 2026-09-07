"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* "← Back" that returns you to where you actually were.

   If you arrived from another page on this site — page 4 of the word list,
   say — the browser's own history has your scroll position, so going back
   through it puts you exactly where you left off. If you arrived from
   elsewhere (a search engine, a shared link), there is nothing to go back
   to, and the link falls back to a fixed destination. The decision is made
   after mount from document.referrer, so the server renders the fallback and
   the link is never broken. */
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
      setCanGoBack(sameSite && !fromEditor && window.history.length > 1);
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

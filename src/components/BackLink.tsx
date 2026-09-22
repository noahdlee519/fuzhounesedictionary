"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { navDepth, navFrom } from "./NavMemory";
import { useL } from "./LangProvider";

/* "← Back" that returns you to where you actually were, and says where.

   Came from another page in this tab (NavMemory): the browser's own Back,
   which restores your scroll position, labelled with the page: "Back to
   review" from the review queue, "Back to Basic lessons" from that part of
   Learn, plain "Back" from anywhere else.

   Opened in a new tab, or by a full page load, from a page on this site:
   there is no history to go back through, so a link to that page instead
   (Basic lessons can't be told apart from the rest of Learn this way, so a
   link to Learn).

   From outside the site, or straight from an entry editor (after Save), the
   fixed fallback. Decided after mount; the server renders the fallback, so
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
  const L = useL();
  const [target, setTarget] = useState<{ mode: "history" | "link"; href: string; label: string } | null>(null);

  useEffect(() => {
    // Name the place a path points at; null when it is not worth returning to.
    const describe = (path: string, zone: string): { href: string; label: string } | null => {
      const p = path.split(/[?#]/)[0];
      if (p.startsWith("/editor/edit/")) return null;
      if (p === "/editor") return { href: "/editor", label: L("← Back to review", "← 返回審核") };
      if (p === "/learn")
        return zone === "lessons"
          ? { href: "/learn#start", label: L("← Back to Basic lessons", "← 返回基礎課程") }
          : { href: path, label: L("← Back to Learn", "← 返回學習") };
      return { href: path, label: L("← Back", "← 返回") };
    };

    try {
      const from = navFrom();
      if (from && navDepth() > 0 && window.history.length > 1) {
        const d = describe(from.path, from.zone);
        if (d) setTarget({ mode: "history", ...d });
        return;
      }
      // A fresh document: only the referrer can say where it came from.
      const ref = document.referrer;
      if (ref && ref.startsWith(window.location.origin)) {
        const u = new URL(ref);
        if (u.pathname !== window.location.pathname) {
          const d = describe(u.pathname + u.search, "");
          if (d) setTarget({ mode: "link", ...d });
        }
      }
    } catch {
      /* Fall through to the fixed link. */
    }
    // The language is fixed for the page's life; L changes identity only with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!target) {
    return (
      <Link href={fallback} className={className}>
        {fallbackLabel}
      </Link>
    );
  }
  if (target.mode === "link") {
    return (
      <Link href={target.href} className={className}>
        {target.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => window.history.back()} className={className}>
      {target.label}
    </button>
  );
}

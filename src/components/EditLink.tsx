"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* An editor's "Edit →" that tells the edit page where to return to after
   Save: the page this one was reached from, when that is a page on this site
   (page 4 of the word list, a search, a profile), otherwise this entry.
   Read from document.referrer after mount; the server renders the entry
   itself as the fallback, so the link always works. */
export default function EditLink({
  entryId,
  here,
  className,
}: {
  entryId: string;
  /** This entry's own path, the fallback destination. */
  here: string;
  className?: string;
}) {
  const [back, setBack] = useState(here);

  useEffect(() => {
    try {
      const ref = document.referrer;
      if (!ref || !ref.startsWith(window.location.origin)) return;
      const u = new URL(ref);
      // Coming from the queue or another edit: returning there is the default anyway.
      if (u.pathname.startsWith("/admin")) return;
      // The referrer never carries a fragment; put the word list's back so the
      // return lands on the list rather than the top of the page.
      const hash = u.pathname === "/learn" ? "#words" : "";
      setBack(u.pathname + u.search + hash);
    } catch {
      /* keep the fallback */
    }
  }, []);

  return (
    <Link href={`/admin/edit/${entryId}?back=${encodeURIComponent(back)}`} className={className}>
      Edit →
    </Link>
  );
}

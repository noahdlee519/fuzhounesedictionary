"use client";

import { useEffect, useState } from "react";

/* A quiet confirmation beside the Save button.

   Rendered on the server from ?saved=1, so the message exists even before any
   JavaScript runs; the script only fades it out again and tidies the query
   string, so a refresh does not replay a confirmation for something that
   happened minutes ago.

   role="status" rather than an alert: this is good news, not an interruption. */
export default function SavedNotice({ seconds = 5 }: { seconds?: number }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("saved")) {
      url.searchParams.delete("saved");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    const t = setTimeout(() => setGone(true), seconds * 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <span
      role="status"
      aria-live="polite"
      className={
        "font-mono text-xs uppercase tracking-[0.1em] text-lacquer transition-opacity duration-700 motion-reduce:transition-none " +
        (gone ? "opacity-0" : "opacity-100")
      }
    >
      Changes saved
    </span>
  );
}

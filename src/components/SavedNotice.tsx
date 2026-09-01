"use client";

import { useEffect, useState } from "react";

/* A quiet confirmation, used beside the Save button on /account and at the top
   of /improve.

   Rendered on the server from a query flag, so the message exists even before
   any JavaScript runs; the script only fades it out again and tidies the query
   string, so a refresh does not replay a confirmation for something that
   happened minutes ago.

   role="status" rather than an alert: this is good news, not an interruption. */
export default function SavedNotice({
  seconds = 5,
  message = "Changes saved",
}: {
  seconds?: number;
  message?: string;
}) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    let touched = false;
    for (const key of ["saved", "sent", "problem"]) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        touched = true;
      }
    }
    if (touched) {
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
      {message}
    </span>
  );
}

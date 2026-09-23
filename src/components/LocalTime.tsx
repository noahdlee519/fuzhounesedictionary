"use client";

import { useEffect, useState } from "react";
import { formatDate, formatDateTime, formatLocalDateTime } from "@/lib/dates";

/* A date or time in the reader's own timezone (Noah, 23 Sep 2026). Pages are
   rendered on the server, which runs on UTC and cannot know where the reader
   is, so the first paint shows the time in UTC and says so; once the page is
   in the browser it is replaced with the reader's local time, labelled with
   their zone ("22 Sept 2026, 11:18 pm GMT-4"). A date alone is redone the same
   way, since a late-evening upload falls on a different day in UTC. */
export default function LocalTime({ iso, time = false, className }: { iso: string; time?: boolean; className?: string }) {
  const [text, setText] = useState(() => (time ? `${formatDateTime(iso, "UTC")} UTC` : formatDate(iso, "UTC")));
  useEffect(() => {
    try {
      setText(time ? formatLocalDateTime(iso) : formatDate(iso));
    } catch {
      /* the UTC text stays */
    }
  }, [iso, time]);
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}

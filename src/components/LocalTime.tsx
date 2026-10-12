"use client";

import { useEffect, useState } from "react";
import { formatDate, formatDateTime, formatLocalDateTime } from "@/lib/dates";
import { useLang } from "@/components/LangProvider";

/* A date or time in the reader's own timezone (Noah, 23 Sep 2026). Pages are
   rendered on the server, which runs on UTC and cannot know where the reader
   is, so the first paint shows the time in UTC and says so; once the page is
   in the browser it is replaced with the reader's local time, labelled with
   their zone ("22 Sept 2026, 11:18 pm GMT-4"; in Chinese "2026年9月22日
   下午11:18 (GMT-4)"). A date alone is redone the same way, since a
   late-evening upload falls on a different day in UTC. */
export default function LocalTime({
  iso,
  time = false,
  month = false,
  className,
}: {
  iso: string;
  time?: boolean;
  /** Month and year only ("October 2026", "2026年10月"): "Member since". */
  month?: boolean;
  className?: string;
}) {
  const lang = useLang();
  const monthText = (tz?: string) =>
    new Date(iso).toLocaleDateString(lang === "zh" ? "zh-TW" : "en-GB", { year: "numeric", month: "long", timeZone: tz });
  const [text, setText] = useState(() =>
    month
      ? monthText("UTC")
      : time
      ? lang === "zh"
        ? `${formatDateTime(iso, "UTC", lang)} (UTC)`
        : `${formatDateTime(iso, "UTC", lang)} UTC`
      : formatDate(iso, "UTC", lang)
  );
  useEffect(() => {
    try {
      setText(month ? monthText() : time ? formatLocalDateTime(iso, lang) : formatDate(iso, undefined, lang));
    } catch {
      /* the UTC text stays */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso, time, month, lang]);
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}

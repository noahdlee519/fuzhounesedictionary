/* Dates the way a diaspora audience reads them without guessing: "1 Sep 2026",
   never "9/1/2026" (1 September in one country, 9 January in another). Fixed
   to English-style day-month-year regardless of the server's locale.

   In Chinese (lang "zh") they read the way Taiwan writes them: 2026年9月1日,
   and times 下午11:18. Every function takes the language last and defaults
   to English, so callers that pass nothing are unchanged.

   Times carry am/pm. On the server (UTC) pass timeZone "UTC"; in the browser
   leave it out and the reader's own zone is used (components/LocalTime). */
import type { Lang } from "./i18n";

const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { ...DATE, hour: "numeric", minute: "2-digit", hour12: true };
// zh-TW with a long month gives 2026年9月23日 (a short month is 2026/9/23).
const ZH_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
const ZH_TIME: Intl.DateTimeFormatOptions = { ...ZH_DATE, hour: "numeric", minute: "2-digit", hour12: true };

export function formatDate(iso: string | Date, timeZone?: string, lang: Lang = "en") {
  const tz = timeZone ? { timeZone } : {};
  return lang === "zh"
    ? new Date(iso).toLocaleDateString("zh-TW", { ...ZH_DATE, ...tz })
    : new Date(iso).toLocaleDateString("en-GB", { ...DATE, ...tz });
}

export function formatDateTime(iso: string | Date, timeZone?: string, lang: Lang = "en") {
  const tz = timeZone ? { timeZone } : {};
  return lang === "zh"
    ? new Date(iso).toLocaleString("zh-TW", { ...ZH_TIME, ...tz })
    : new Date(iso).toLocaleString("en-GB", { ...TIME, ...tz });
}

/** The reader's local time with their zone's short name: "22 Sept 2026, 11:18 pm GMT-4",
 *  or in Chinese "2026年9月22日 下午11:18 (GMT-4)". The zone name comes from
 *  en-GB in both, since zh-TW names American zones "EDT" rather than GMT-4. */
export function formatLocalDateTime(iso: string | Date, lang: Lang = "en") {
  const d = new Date(iso);
  if (lang !== "zh") return d.toLocaleString("en-GB", { ...TIME, timeZoneName: "short" });
  const zone = new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value;
  const text = d.toLocaleString("zh-TW", ZH_TIME);
  return zone ? `${text} (${zone})` : text;
}

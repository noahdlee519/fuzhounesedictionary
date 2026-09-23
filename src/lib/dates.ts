/* Dates the way a diaspora audience reads them without guessing: "1 Sep 2026",
   never "9/1/2026" (1 September in one country, 9 January in another). Fixed
   to English-style day-month-year regardless of the server's locale.

   Times carry am/pm. On the server (UTC) pass timeZone "UTC"; in the browser
   leave it out and the reader's own zone is used (components/LocalTime). */
const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { ...DATE, hour: "numeric", minute: "2-digit", hour12: true };

export function formatDate(iso: string | Date, timeZone?: string) {
  return new Date(iso).toLocaleDateString("en-GB", { ...DATE, ...(timeZone ? { timeZone } : {}) });
}

export function formatDateTime(iso: string | Date, timeZone?: string) {
  return new Date(iso).toLocaleString("en-GB", { ...TIME, ...(timeZone ? { timeZone } : {}) });
}

/** The reader's local time with their zone's short name: "22 Sept 2026, 11:18 pm GMT-4". */
export function formatLocalDateTime(iso: string | Date) {
  return new Date(iso).toLocaleString("en-GB", { ...TIME, timeZoneName: "short" });
}

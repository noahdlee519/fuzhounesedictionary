/* Dates the way a diaspora audience reads them without guessing: "1 Sep 2026",
   never "9/1/2026" (1 September in one country, 9 January in another). Fixed
   to English-style day-month-year regardless of the server's locale. */
const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { ...DATE, hour: "numeric", minute: "2-digit" };

export function formatDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString("en-GB", DATE);
}

export function formatDateTime(iso: string | Date) {
  return new Date(iso).toLocaleString("en-GB", TIME);
}

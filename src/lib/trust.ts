/* "Trust, then verify" for voice recordings. A recording from anyone signed
   in goes live the moment it is saved, and editors check it afterwards: it
   stays in the Review queue, marked as live, until an editor keeps it or
   takes it down. Words, meanings and suggested edits are reviewed first, as
   always.

   Began 22 Sep 2026 as a two-day trial; made permanent on 23 Sep 2026
   (Noah: "let's permanently keep the system"). TRUST_RECORDINGS_UNTIL is
   null, so the window never closes. Everything on the site that describes it
   (the recorder's "saved" line, the Record page, Contribute, About, the
   terms) follows recordingsTrusted(); to go back to review-first, set
   TRUST_RECORDINGS_UNTIL to a date in the past. */
export const TRUST_RECORDINGS_FROM = "2026-09-22T00:00:00Z";
/** No end date: recordings go live on save for good. */
export const TRUST_RECORDINGS_UNTIL: string | null = null;

export function recordingsTrusted(now: number = Date.now()): boolean {
  if (now < Date.parse(TRUST_RECORDINGS_FROM)) return false;
  return TRUST_RECORDINGS_UNTIL === null || now < Date.parse(TRUST_RECORDINGS_UNTIL);
}

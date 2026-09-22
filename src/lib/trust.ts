/* "Trust, then verify" for voice recordings (Noah, 22 Sep 2026: "for the next
   two days"). While the window is open, a recording from anyone signed in
   goes live the moment it is saved, and editors check it afterwards: it
   stays in the Review queue, marked as live, until an editor keeps it or
   takes it down. Words, meanings and suggested edits are reviewed first, as
   always.

   The window closes by itself at TRUST_RECORDINGS_UNTIL, and everything on
   the site that describes it (the recorder's "saved" line, the Record page,
   Contribute, About, the footer, the terms) goes back to the review-first
   wording on its own. To extend it, move the date; to end it now, set it to
   the past. */
export const TRUST_RECORDINGS_FROM = "2026-09-22T00:00:00Z";
/** Midnight at the start of Thursday 24 Sep 2026, New York time. */
export const TRUST_RECORDINGS_UNTIL = "2026-09-24T04:00:00Z";

export function recordingsTrusted(now: number = Date.now()): boolean {
  return now >= Date.parse(TRUST_RECORDINGS_FROM) && now < Date.parse(TRUST_RECORDINGS_UNTIL);
}

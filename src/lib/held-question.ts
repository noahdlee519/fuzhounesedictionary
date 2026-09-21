/* A question typed before signing in, kept until the person comes back
   signed in, and then asked for them.

   The assistant answers only signed-in visitors — every answer costs money
   and the daily limits are per account. But making someone sign in before
   they may even type turns them away at the door. So a signed-out visitor
   types, presses Ask, and is asked to sign in to see the answer; the
   question waits here across the trip to Google and back, and is sent the
   moment the page loads signed in.

   localStorage, per browser, never sent anywhere until it is asked. An hour
   old and it is dropped: someone who signs in tomorrow did not mean to have
   yesterday's question fired off. Every call swallows a storage error (a
   private window, blocked site data) into "nothing held". */

const KEY = "fz:held-question";
const TTL_MS = 60 * 60 * 1000;

export function holdQuestion(q: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ q, at: Date.now() }));
  } catch {
    /* storage unavailable: they will have to type it again */
  }
}

/** The held question, if there is a fresh one. Does not remove it. */
export function peekQuestion(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { q, at } = JSON.parse(raw) as { q?: unknown; at?: unknown };
    if (typeof q !== "string" || !q.trim() || typeof at !== "number" || Date.now() - at > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return q;
  } catch {
    return null;
  }
}

/** The held question, removed so it is asked once. */
export function takeQuestion(): string | null {
  const q = peekQuestion();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
  return q;
}

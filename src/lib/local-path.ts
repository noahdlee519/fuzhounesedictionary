/* A path a page may send the browser to after an action — the `next` on the
   sign-in callback, the `back` on the admin forms. It has to be somewhere on
   this site: an absolute URL, or anything a browser would read as one, must
   not get through, or a crafted link becomes a redirect to another host.

   "/" is the only safe first character, and even then not "//" — a
   scheme-relative URL — nor "/\", which browsers quietly treat the same way.
   Everything else falls back to a path the caller chooses. The same check used
   to be written out in eight places; one copy is one place to get it right. */
export function localPath(raw: string | null | undefined, fallback: string): string {
  const s = (raw ?? "").trim();
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//") || s.startsWith("/\\")) return fallback;
  return s;
}

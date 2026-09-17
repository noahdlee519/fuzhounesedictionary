"use client";

import { createClient } from "@/lib/supabase/client";

/* Kicks off Google OAuth from the browser, returning to `next` on this site.
   Shared by the sign-in button and the recorder, which sends someone to sign
   in with a take already held.

   Come back to the host the browser is ACTUALLY on, never to a build-time
   site URL. Sign-in uses PKCE: the browser writes a code-verifier cookie
   before leaving for Google, and the callback has to read that same cookie.
   A cookie belongs to one host, so the return address has to be this host —
   window.location.origin is right on the apex domain, www, the vercel.app
   URL, a preview deployment and localhost alike. Each host must be listed
   under Redirect URLs in the Supabase dashboard.

   Resolves to an error message only if the redirect to Google never
   happened; on success the page is already leaving. */
export async function startGoogleSignIn(next: string): Promise<string | null> {
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return error ? error.message : null;
}

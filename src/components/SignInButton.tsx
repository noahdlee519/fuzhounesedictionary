"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Kicks off Google OAuth. After Google, the user returns to /auth/callback,
// which sets the session and redirects to `next`.
export default function SignInButton({
  next = "/",
  label = "Sign in with Google",
  className,
}: {
  next?: string;
  label?: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setError(null);
    setBusy(true);
    const supabase = createClient();

    /* Come back to the host the browser is ACTUALLY on, never to a build-time
       site URL.

       This is what made signing in take two attempts. Sign-in uses PKCE: the
       browser writes a code-verifier cookie before leaving for Google, and the
       callback has to read that same cookie to exchange the code for a session.
       A cookie belongs to one host. So when NEXT_PUBLIC_SITE_URL pointed at a
       different host than the one being browsed, the verifier was written on one
       host and looked for on another, the exchange failed, and the user landed
       back signed out — on the other host. Trying again from there worked,
       because by then both halves were on the same host.

       window.location.origin is right on every host at once: the apex domain,
       www, the vercel.app URL, a preview deployment, and localhost. Each host
       must be listed under Redirect URLs in the Supabase dashboard. */
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    // Reached only if the redirect to Google never happened.
    if (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
    <button
      onClick={signIn}
      disabled={busy}
      className={
        className ??
        "inline-flex items-center gap-2 border border-rule bg-surface px-5 py-2.5 text-ink transition-colors hover:border-lacquer hover:text-lacquer"
      }
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
      </svg>
      {busy ? "Opening Google…" : label}
    </button>
    {error && (
      <span role="alert" className="text-sm text-lacquer">
        {error}
      </span>
    )}
    </span>
  );
}

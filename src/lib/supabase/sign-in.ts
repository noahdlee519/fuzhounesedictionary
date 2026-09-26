"use client";

import { createClient } from "@/lib/supabase/client";

/* Signing in from the browser, two ways: Google, or a code sent by email.
   Shared by the sign-in dialog (SignInDialog), which the sign-in button and
   the recorder both open.

   Email is there for people who cannot reach Google — most of mainland China
   (Noah, 26 Sep 2026). Supabase sends one email with both a 6-digit code and
   a link. The code is typed into the dialog and works on any device: someone
   can ask on a computer and read the email on a phone. The link goes to
   /auth/callback, which handles it on whichever device opens it (with the
   email template in supabase/email_signin.md; without it, only in this
   browser). No passwords: the code is the password, once.

   Come back to the host the browser is ACTUALLY on, never to a build-time
   site URL. Google sign-in uses PKCE: the browser writes a code-verifier
   cookie before leaving for Google, and the callback has to read that same
   cookie. A cookie belongs to one host, so the return address has to be this
   host — window.location.origin is right on the apex domain, www, the
   vercel.app URL, a preview deployment and localhost alike. Each host must be
   listed under Redirect URLs in the Supabase dashboard. */

function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Why a sign-in step failed: Supabase's error code where it gives one, and
 *  its message (English) for anything the dialog has no words of its own for. */
export type SignInError = { code: string | null; message: string };

function asError(error: { message: string; code?: string } | null): SignInError | null {
  return error ? { code: error.code ?? null, message: error.message } : null;
}

/* Resolves to an error only if the redirect to Google never happened; on
   success the page is already leaving. */
export async function startGoogleSignIn(next: string): Promise<SignInError | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(next) },
  });
  return asError(error);
}

/* Sends the code (and link) to `email`. A new address gets an account, the
   same as a first Google sign-in does. */
export async function sendEmailCode(email: string, next: string): Promise<SignInError | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: true },
  });
  return asError(error);
}

/* Checks the code typed in. On success the session cookie is already set,
   so the page only has to load again to be signed in. */
export async function verifyEmailCode(email: string, code: string): Promise<SignInError | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  return asError(error);
}

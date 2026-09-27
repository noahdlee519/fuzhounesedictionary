import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { localPath } from "@/lib/local-path";

/* Where every sign-in comes back to, then sends the person on to `next`.

   ?code=        Google, and the sign-in link in an email sent with
                 Supabase's default template. PKCE: the code only exchanges
                 in the browser that asked for it.
   ?token_hash=  The sign-in link in an email sent with this site's template
                 (supabase/email_signin.md). Verified on the server, so it
                 works on any device — ask on a computer, open the email on a
                 phone. */
/** What /?auth_error= can say; the home page has the words (AUTH_ERRORS). */
type AuthErrorCode = "link_incomplete" | "link_expired" | "other_browser" | "cancelled" | "no_code" | "failed";

const EMAIL_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only ever redirect to a path on this site. "//evil.com" and "https://..."
  // are rejected rather than trusted, since `next` arrives in the query string.
  const raw = searchParams.get("next") ?? "/";
  const next = localPath(raw, "/");

  /* The home page says what went wrong. It gets a short code, never the
     text itself: the text was shown as given, so a link to
     /?auth_error=<anything> put anyone's words in the site's own notice, and
     it was English on the Chinese site (audit, 26 Sep 2026). The detail
     goes to the server log (Vercel → Logs), where Noah can read it. */
  const fail = (code: AuthErrorCode, detail?: string) => {
    if (detail) console.error(`sign-in failed (${code}): ${detail}`);
    return NextResponse.redirect(`${origin}/?auth_error=${code}`);
  };

  const supabase = createClient();

  if (tokenHash) {
    if (!type || !EMAIL_TYPES.includes(type)) return fail("link_incomplete");
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail(/expired|invalid/i.test(error.message) ? "link_expired" : "failed", error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (!code) {
    // Google sends its own reason when the user cancels or the app is blocked.
    const desc = searchParams.get("error_description") ?? searchParams.get("error");
    return fail(searchParams.get("error") === "access_denied" ? "cancelled" : "no_code", desc ?? undefined);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // An emailed link opened in a different browser from the one that asked
    // for it has no code verifier here. Say what to do instead.
    if (/code verifier|code_verifier/i.test(error.message)) return fail("other_browser", error.message);
    // Was silently swallowed before, which is why a broken sign-in looked like
    // nothing happening at all.
    return fail("failed", error.message);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth redirect target: exchanges the ?code for a session cookie, then sends
// the user back where they started.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only ever redirect to a path on this site. "//evil.com" and "https://..."
  // are rejected rather than trusted, since `next` arrives in the query string.
  const raw = searchParams.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const fail = (why: string) =>
    NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(why)}`);

  if (!code) {
    // Google sends its own reason when the user cancels or the app is blocked.
    const desc = searchParams.get("error_description") ?? searchParams.get("error");
    return fail(desc ?? "Google did not send a sign-in code back.");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Was silently swallowed before, which is why a broken sign-in looked like
    // nothing happening at all. The message is worth showing.
    return fail(error.message);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

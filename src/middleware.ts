import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/* The name of the header that carries who is signed in from here to the
   page. Set only by this middleware; any copy a browser sends is removed
   first, so a page can trust it. */
export const SESSION_HEADER = "x-fz-session";

// Refreshes the Supabase auth session on every request so Server Components
// always see a valid user. Standard @supabase/ssr middleware pattern.
//
// It also hands the page what it verified. Checking the sign-in is a round
// trip to Supabase Auth, and the page used to make the same check again
// (lib/auth getSessionUser) on every signed-in request, which was 0.2–0.4s.
// Now the user this check returns goes to the page in a request header, and
// the page reads that instead of asking again.
export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Never trust a copy that arrived with the request.
  headers.delete(SESSION_HEADER);
  const forward = () => NextResponse.next({ request: { headers } });
  let response = forward();

  // No Supabase session cookie means no session to refresh. Most visitors
  // are signed out, and this skips a network round-trip to Supabase Auth on
  // every one of their page views. Signed-in requests carry
  // "sb-<ref>-auth-token" (possibly chunked as ".0", ".1", …).
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasSession) {
    // Nobody to look up: tell the page so, and it will not look either.
    headers.set(SESSION_HEADER, "none");
    return forward();
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // A refreshed token goes to the page as well as to the browser.
          headers.set("cookie", request.cookies.toString());
          response = forward();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touch the user to trigger a token refresh when needed. Never let a
  // transient auth/network error take down the whole request.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // "none" when the check ran and there is nobody; the page then does not
    // ask again either. When the check failed outright, no header at all,
    // and the page makes its own.
    headers.set(SESSION_HEADER, user ? encodeURIComponent(JSON.stringify({ id: user.id, email: user.email ?? null })) : "none");
    const cookies = response.cookies.getAll();
    response = forward();
    cookies.forEach((c) => response.cookies.set(c));
  } catch {
    // ignore — pages handle the unauthenticated / offline case themselves
  }
  return response;
}

export const config = {
  // Run on everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg)$).*)"],
};

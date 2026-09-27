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
  /* A query parameter given twice (?q=a&q=b) reaches a page as an array,
     and every page reads its parameters as strings: `.trim()` on an array
     threw, and /, /browse, /request and others answered 500 (audit, 26 Sep
     2026). Rather than guard every read, such an address is sent on to the
     same one with only the first of each. Page loads only; a form post is
     left alone. */
  if (request.method === "GET" || request.method === "HEAD") {
    const params = request.nextUrl.searchParams;
    const keys = Array.from(params.keys());
    if (new Set(keys).size !== keys.length) {
      const url = request.nextUrl.clone();
      url.search = "";
      for (const k of new Set(keys)) url.searchParams.set(k, params.get(k) ?? "");
      return NextResponse.redirect(url, 308);
    }
  }

  const headers = new Headers(request.headers);
  // Never trust a copy that arrived with the request.
  headers.delete(SESSION_HEADER);
  const forward = () => NextResponse.next({ request: { headers } });
  let response = forward();

  // A static file needs no session. It still passes through here, so that
  // the header above is removed on every path: the matcher used to skip any
  // path ending in .png, .svg and so on, and a dynamic route matches those
  // too (/entry/x.png, /editor/edit/x.png) — a forged header then reached
  // the page and its server actions as "the signed-in user" (audit, 26 Sep
  // 2026). No header at all here: nothing on such a path should trust one.
  if (ASSET.test(request.nextUrl.pathname)) return forward();

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
      error,
    } = await supabase.auth.getUser();
    // "none" when the check ran and there is nobody; the page then does not
    // ask again either. When the check failed — getUser reports a network
    // error or an Auth outage in `error` rather than throwing — no header at
    // all, and the page makes its own, rather than showing a signed-in person
    // as signed out.
    const nobody = !user && (!error || error.name === "AuthSessionMissingError" || error.status === 401 || error.status === 403);
    if (user) headers.set(SESSION_HEADER, encodeURIComponent(JSON.stringify({ id: user.id, email: user.email ?? null })));
    else if (nobody) headers.set(SESSION_HEADER, "none");
    const cookies = response.cookies.getAll();
    response = forward();
    cookies.forEach((c) => response.cookies.set(c));
  } catch {
    // ignore — pages handle the unauthenticated / offline case themselves
  }
  return response;
}

/* Paths that are files: answered straight away above, with no Auth call. */
const ASSET = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg|txt|xml|webmanifest)$/i;

export const config = {
  // Everything except Next's own build files. Static files from public/ are
  // included on purpose (see ASSET above): this is what strips a forged
  // session header, so no path may skip it.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

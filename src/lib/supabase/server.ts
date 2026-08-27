import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Supabase client (anon key) bound to the request's cookies, so it acts
// as the signed-in user and RLS applies. Safe in Server Components, Route
// Handlers, and Server Actions.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — cookies are read-only here.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    }
  );
}

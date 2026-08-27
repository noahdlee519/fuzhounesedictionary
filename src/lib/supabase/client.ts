"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client (anon key). Carries the signed-in user's session via
// cookies. Used for OAuth sign-in and authenticated audio uploads.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

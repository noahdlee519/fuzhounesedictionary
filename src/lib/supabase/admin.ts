import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. BYPASSES Row Level Security. Server-only — the
// "server-only" import makes the build fail if this is pulled into client code.
// Used exclusively for editor moderation actions (guarded by requireEditor()).
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL on the server.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

import { cache } from "react";
import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/* Must match SESSION_HEADER in src/middleware.ts. Not imported from there:
   the middleware file runs on the edge and is not a module pages import. */
const SESSION_HEADER = "x-fz-session";

/* Who the middleware found signed in, if it checked: the user, null for
   "checked, nobody", or undefined when there was nothing to go on (it did not
   run, or its check failed) and the page must ask Supabase itself. */
function fromMiddleware(): User | null | undefined {
  let raw: string | null = null;
  try {
    raw = headers().get(SESSION_HEADER);
  } catch {
    return undefined; // outside a request (build time)
  }
  if (!raw) return undefined;
  if (raw === "none") return null;
  try {
    const u = JSON.parse(decodeURIComponent(raw)) as { id?: unknown; email?: unknown };
    if (typeof u.id !== "string" || !u.id) return undefined;
    // Only id and email are read anywhere on the site.
    return { id: u.id, email: typeof u.email === "string" ? u.email : undefined } as unknown as User;
  } catch {
    return undefined;
  }
}

// Returns the signed-in user (or null) plus their profile row.
// cache() dedupes within one server render: Header and the page both call
// this. The sign-in itself was already checked by the middleware on this
// request (a round trip to Supabase Auth), which passes the result on in a
// header it alone can set; only when that is missing does this check again.
export const getSessionUser = cache(async function getSessionUser() {
  const supabase = createClient();
  let user = fromMiddleware();
  if (user === undefined) {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  }
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, is_editor, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile ?? null };
});

export async function isEditor(): Promise<boolean> {
  const { profile } = await getSessionUser();
  return Boolean(profile?.is_editor);
}

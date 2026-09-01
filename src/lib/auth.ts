import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in user (or null) plus their profile row.
// cache() dedupes within one server render: Header and the page both call
// this, and each call is a network round-trip to Supabase Auth plus a
// profiles query. Now they share one.
export const getSessionUser = cache(async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

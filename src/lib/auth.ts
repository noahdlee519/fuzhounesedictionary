import { createClient } from "@/lib/supabase/server";

// Returns the signed-in user (or null) plus their profile row.
export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, is_editor")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile ?? null };
}

export async function isEditor(): Promise<boolean> {
  const { profile } = await getSessionUser();
  return Boolean(profile?.is_editor);
}

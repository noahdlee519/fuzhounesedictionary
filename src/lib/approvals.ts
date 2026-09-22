import { createClient } from "@/lib/supabase/server";

/* How many of a person's contributions an editor has approved since they last
   dismissed the notice (profiles.approvals_seen_at, approval_notices.sql).
   Words, recordings and suggestions all count. An editor's own work is
   published the moment it is sent, with no one approving it, so rows
   approved within a minute of being made are not news and are left out —
   and an editor gets no approval notices at all: what they write publishes
   itself, and what they approve they approved. Returns zeros if the column
   does not exist yet. */
export interface Approvals {
  words: number;
  recordings: number;
  suggestions: number;
  total: number;
}

const NONE: Approvals = { words: 0, recordings: 0, suggestions: 0, total: 0 };

export async function newApprovals(userId: string): Promise<Approvals> {
  const supabase = createClient();
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("approvals_seen_at, is_editor")
    .eq("id", userId)
    .maybeSingle();
  const seen = (prof as any)?.approvals_seen_at as string | undefined;
  if (error || !seen || (prof as any)?.is_editor) return NONE;

  const count = async (table: string) => {
    const { data, error: e } = await supabase
      .from(table)
      .select("created_at, reviewed_at")
      .eq("contributor_id", userId)
      .eq("status", "approved")
      .gt("reviewed_at", seen)
      .limit(500);
    if (e) return 0;
    return ((data ?? []) as { created_at: string; reviewed_at: string }[]).filter(
      (r) => new Date(r.reviewed_at).getTime() - new Date(r.created_at).getTime() > 60_000
    ).length;
  };
  const [words, recordings, suggestions] = await Promise.all([count("entries"), count("recordings"), count("suggestions")]);
  return { words, recordings, suggestions, total: words + recordings + suggestions };
}

/* True once, for someone who has just been made an editor and has not yet
   dismissed the welcome (profiles.editor_welcomed_at, approval_notices.sql).
   False if the column does not exist yet. */
export async function editorWelcome(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_editor, editor_welcomed_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return Boolean((data as any).is_editor) && !(data as any).editor_welcomed_at;
}

import { createClient } from "@/lib/supabase/server";

/* What has happened to a person's contributions since they last dismissed
   the notice (profiles.approvals_seen_at, approval_notices.sql): the red dot
   on their picture and the banner on their account page.

   - accepted: words, recordings and suggestions an editor approved. An
     editor's own work publishes itself the moment it is sent, so rows
     approved within a minute of being made are not news and are left out,
     and editors get no "accepted" notices at all.
   - sentBack: the same three, turned down by an editor. Until 11 Oct 2026 a
     rejection made no sound at all; now it is news too, and the account
     page shows the editor's note beside the item.
   - thumbs: thumbs-up from other people on their recordings
     (thumbs_notices.sql). Editors get these too.
   - requests: words they asked for that have since been recorded or added
     (request_fulfilment.sql). Editors get these too.

   Each part is zero when what it needs is not there yet (a column, a
   function), so a migration not yet run never breaks the page. */
export interface Counts {
  words: number;
  recordings: number;
  suggestions: number;
}

export interface Approvals {
  accepted: Counts;
  sentBack: Counts;
  thumbs: number;
  requests: number;
  /** Words they added or recorded that an editor deleted (contributor_notices). */
  removed: string[];
  /** Their recordings an editor deleted, by the word they were of. */
  removedTakes: string[];
  total: number;
}

const ZERO: Counts = { words: 0, recordings: 0, suggestions: 0 };
const NONE: Approvals = { accepted: ZERO, sentBack: ZERO, thumbs: 0, requests: 0, removed: [], removedTakes: [], total: 0 };
const sum = (c: Counts) => c.words + c.recordings + c.suggestions;

export async function newApprovals(userId: string): Promise<Approvals> {
  const supabase = createClient();
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("approvals_seen_at, is_editor")
    .eq("id", userId)
    .maybeSingle();
  const seen = (prof as any)?.approvals_seen_at as string | undefined;
  if (error || !seen) return NONE;
  const editor = Boolean((prof as any)?.is_editor);

  const reviewed = async (table: string, status: "approved" | "rejected") => {
    const { data, error: e } = await supabase
      .from(table)
      .select("created_at, reviewed_at")
      .eq("contributor_id", userId)
      .eq("status", status)
      .gt("reviewed_at", seen)
      .limit(500);
    if (e) return 0;
    return ((data ?? []) as { created_at: string; reviewed_at: string }[]).filter(
      (r) => new Date(r.reviewed_at).getTime() - new Date(r.created_at).getTime() > 60_000
    ).length;
  };
  const counts = async (status: "approved" | "rejected"): Promise<Counts> => {
    if (editor) return ZERO;
    const [words, recordings, suggestions] = await Promise.all([
      reviewed("entries", status),
      reviewed("recordings", status),
      reviewed("suggestions", status),
    ]);
    return { words, recordings, suggestions };
  };

  const [accepted, sentBack, thumbs, requests, notices] = await Promise.all([
    counts("approved"),
    counts("rejected"),
    supabase.rpc("my_new_thumbs_up").then(({ data, error: e }) => (e ? 0 : Number(data) || 0)),
    supabase
      .from("word_requests")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", userId)
      .eq("status", "fulfilled")
      .gt("fulfilled_at", seen)
      .then(({ count, error: e }) => (e ? 0 : count ?? 0)),
    supabase
      .from("contributor_notices")
      .select("kind, detail")
      .eq("user_id", userId)
      .gt("created_at", seen)
      .limit(40)
      .then(({ data, error: e }) => (e ? [] : ((data ?? []) as { kind: string; detail: string | null }[]))),
  ]);
  const removed = notices.filter((n) => n.kind === "word_removed").map((n) => n.detail ?? "");
  const removedTakes = notices.filter((n) => n.kind === "recording_removed").map((n) => n.detail ?? "");
  return {
    accepted,
    sentBack,
    thumbs,
    requests,
    removed,
    removedTakes,
    total: sum(accepted) + sum(sentBack) + thumbs + requests + removed.length + removedTakes.length,
  };
}

export { sum as countSum };

/** A contributor_notices detail ("hanzi\tromanization\theadword", written
 *  by editor/actions.ts) as its parts, for showing with romText. An older
 *  plain-text detail comes back as the headword. */
export function noticeWord(detail: string): { hanzi: string; romanization: string; headword: string } {
  if (!detail.includes("\t")) return { hanzi: "", romanization: "", headword: detail };
  const [hanzi = "", romanization = "", headword = ""] = detail.split("\t");
  return { hanzi, romanization, headword };
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

/* The editor invitation (Noah, 23 Sep 2026): someone who is not an editor
   and has recorded INVITE_RECORDINGS words or added INVITE_WORDS words is
   asked, once, whether they would like to become one. Counts everything they
   have sent that was not turned down (live or still waiting). Null when there
   is nothing to show: not enough yet, already an editor, already dismissed,
   or the column (editor_invite.sql) not there yet. */
import { INVITE_RECORDINGS, INVITE_WORDS } from "./invite";
export { INVITE_RECORDINGS, INVITE_WORDS };

export interface EditorInvite {
  recordings: number;
  words: number;
}

export async function editorInvite(userId: string): Promise<EditorInvite | null> {
  const supabase = createClient();
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("is_editor, editor_invite_seen_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !prof || (prof as any).is_editor || (prof as any).editor_invite_seen_at) return null;

  const count = async (table: string) => {
    const { count: n, error: e } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("contributor_id", userId)
      .neq("status", "rejected");
    return e ? 0 : n ?? 0;
  };
  const [recordings, words] = await Promise.all([count("recordings"), count("entries")]);
  return recordings >= INVITE_RECORDINGS || words >= INVITE_WORDS ? { recordings, words } : null;
}

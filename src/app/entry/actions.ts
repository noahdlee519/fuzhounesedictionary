"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { localPath } from "@/lib/local-path";

/* Thumbs up or down on a recording. One vote per person: pressing the same
   thumb again withdraws it, pressing the other flips it. Runs as the
   signed-in user; RLS only lets a person write rows carrying their own id
   (supabase/recording_votes.sql). */
export async function voteRecording(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const id = String(formData.get("id") ?? "").trim();
  const value = Number(formData.get("value"));
  const raw = String(formData.get("back") ?? "");
  const back = localPath(raw, "/");
  if (!user || !id || (value !== 1 && value !== -1)) redirect(back);

  const { data: mine } = await supabase
    .from("recording_votes")
    .select("value")
    .eq("recording_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } =
    mine && mine.value === value
      ? await supabase.from("recording_votes").delete().eq("recording_id", id).eq("user_id", user.id)
      : await supabase
          .from("recording_votes")
          .upsert({ recording_id: id, user_id: user.id, value }, { onConflict: "recording_id,user_id" });
  // A failed vote used to look exactly like a counted one.
  if (error) console.error(`vote on ${id} failed: ${error.message}`);

  revalidatePath(back.split("#")[0]);
  redirect(back);
}

/* A suggested edit to a word: free text, into the same review queue as IPA
   and example suggestions (kind 'edit', supabase/suggest_edit.sql). The
   database holds it at 'pending' for anyone but an editor, and an editor
   makes the change by hand. */
export async function suggestEdit(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const entryId = String(formData.get("entry_id") ?? "").trim();
  const here = entryId ? `/entry/${entryId}` : "/";
  if (!user || !entryId) redirect(here);

  // 'edit' (Suggest an edit) or 'report' (Report); both land in Review.
  const kind = String(formData.get("kind") ?? "edit") === "report" ? "report" : "edit";
  const param = kind === "report" ? "report" : "edit";
  const anchor = kind === "report" ? "report" : "suggest";
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 60);
  const details = String(formData.get("value") ?? "").trim();
  const value = (kind === "report" ? [reason && `Reason: ${reason}`, details].filter(Boolean).join("\n\n") : details).slice(0, 500);
  if (!value || (kind === "report" && !reason)) redirect(`${here}?${param}=empty#${anchor}`);

  const { error } = await supabase.from("suggestions").insert({
    entry_id: entryId,
    kind,
    sense_id: null,
    value,
    contributor_id: user.id,
  });
  if (error) {
    const msg =
      error.code === "23505"
        ? "You have already sent that suggestion for this word."
        : error.code === "23514" && /kind/.test(error.message)
          ? "This is not switched on yet. Please try again later."
          : error.message;
    redirect(`${here}?${param}=${encodeURIComponent(msg)}#${anchor}`);
  }
  revalidatePath("/editor");
  redirect(`${here}?${param}=sent#${anchor}`);
}

/* A comment on a word, or on one of its recordings (supabase/comments.sql).
   Live when posted; editors are told by the red count on Contribute and read
   it on the Review page. Runs as the signed-in user: the row rules make it
   theirs, on a word they can see, and the database stamps the time and caps
   the rate. Back to the comments, with the outcome in the address. */
export async function addComment(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const entryId = String(formData.get("entry_id") ?? "").trim();
  const recordingId = String(formData.get("recording_id") ?? "").trim() || null;
  const here = entryId ? `/entry/${entryId}` : "/";
  if (!user || !entryId) redirect(here);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) redirect(`${here}?comment=empty${recordingId ? `&on=${recordingId}` : ""}#comments`);

  const { error } = await supabase.from("comments").insert({
    entry_id: entryId,
    recording_id: recordingId,
    author_id: user.id,
    body: body.slice(0, 1000),
  });
  if (error) {
    console.error(`comment on ${entryId} failed: ${error.message}`);
    const msg =
      error.code === "23514" || error.code === "P0001"
        ? error.message
        : "Your comment could not be posted. Please try again.";
    redirect(`${here}?comment=${encodeURIComponent(msg.slice(0, 200))}${recordingId ? `&on=${recordingId}` : ""}#comments`);
  }
  revalidatePath(here);
  revalidatePath("/editor");
  redirect(`${here}?comment=sent#comments`);
}

/* Take a comment down: its author, or an editor (the row rules decide). */
export async function deleteComment(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = String(formData.get("id") ?? "").trim();
  const back = localPath(String(formData.get("back") ?? ""), "/");
  if (!user || !id) redirect(back);
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) console.error(`delete comment ${id} failed: ${error.message}`);
  revalidatePath(back.split("#")[0].split("?")[0]);
  revalidatePath("/editor");
  redirect(back);
}

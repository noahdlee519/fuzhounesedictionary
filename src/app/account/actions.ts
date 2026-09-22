"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { AUDIO_BUCKET, AVATAR_BUCKET } from "@/lib/constants";
import { ORIGIN_AREA_CODES, ORIGIN_PRECISIONS } from "@/lib/origins";
import { MAX_RECORDING_NOTE } from "@/lib/constants";
import { localPath } from "@/lib/local-path";

export async function saveProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // An expired session used to make Save do nothing, silently.
  if (!user) redirect("/account");

  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 80);
  const areaRaw = String(formData.get("origin_area") ?? "").trim();
  const area = ORIGIN_AREA_CODES.includes(areaRaw) ? areaRaw : "";
  const locality = String(formData.get("origin_locality") ?? "").trim().slice(0, 120);

  const precisionRaw = String(formData.get("origin_precision") ?? "hidden");
  const precision = (ORIGIN_PRECISIONS as readonly string[]).includes(precisionRaw)
    ? precisionRaw
    : "hidden";

  // The database trigger scrubs whatever the chosen precision does not publish.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      origin_area: area || null,
      origin_locality: locality || null,
      origin_precision: precision,
    })
    .eq("id", user.id);
  // A failed write used to come back as "Changes saved". Say so instead.
  if (error) redirect("/account?problem=1");

  revalidatePath("/account");
  revalidatePath(`/contributor/${user.id}`);
  // Comes back as ?saved=1, which is what puts the confirmation on screen.
  redirect("/account?saved=1");
}

/* Add or change the note on one of your own recordings, from the account page.
   Runs as the signed-in user: RLS limits the update to rows they contributed,
   and a trigger keeps every column but `note` unchanged
   (supabase/recording_note.sql). */
export async function saveRecordingNote(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account");

  const id = String(formData.get("id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_RECORDING_NOTE) || null;
  // Where the form was: the account page (default) or an entry page. Only a
  // path on this site is honoured — the same guard as everywhere else.
  const raw = String(formData.get("back") ?? "").trim();
  const back = localPath(raw, "/account?show=recordings");
  const withFlag = (flag: string) => `${back}${back.includes("?") ? "&" : "?"}${flag}`;
  if (!id) redirect(back);

  const { data: row, error } = await supabase
    .from("recordings")
    .update({ note })
    .eq("id", id)
    .eq("contributor_id", user.id)
    .select("entry_id")
    .maybeSingle();
  // No row back means nothing was changed (not theirs, or the note column is
  // not there yet) — say so rather than "saved".
  if (error || !row) redirect(withFlag("problem=1"));

  revalidatePath("/account");
  revalidatePath(`/contributor/${user.id}`);
  if (row?.entry_id) revalidatePath(`/entry/${row.entry_id}`);
  redirect(withFlag("saved=1"));
}

/* Delete the signed-in person's account. What the privacy policy promises:
   profile, email, pending and rejected items go; published words and
   meanings stay in the dictionary, credited to "a contributor"; recordings
   go too if they ask (the checkbox).

   Order matters. Files first (they need the row's URL to find them), then
   recordings if asked, then the auth user — profiles cascades from
   auth.users, and every other table either cascades (votes) or sets its
   contributor column to null, which is what turns a name into "a
   contributor". The action then signs the browser out, because the session
   cookie now points at a user that does not exist. */
export async function deleteAccount(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // The form spells the word out; a stray click on a red button is not consent.
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== "delete") {
    redirect("/account?problem=confirm#delete");
  }
  const alsoRecordings = formData.get("recordings") === "on";

  const admin = adminClient();
  const uid = user.id;

  // Avatar files live under <uid>/ in the avatars bucket.
  const { data: avatarFiles } = await admin.storage.from(AVATAR_BUCKET).list(uid);
  if (avatarFiles?.length) {
    await admin.storage.from(AVATAR_BUCKET).remove(avatarFiles.map((f) => `${uid}/${f.name}`));
  }

  if (alsoRecordings) {
    const { data: recs } = await admin.from("recordings").select("id, audio_url, entry_id").eq("contributor_id", uid);
    const paths = (recs ?? [])
      .map((r) => audioPath(r.audio_url))
      .filter((p): p is string => Boolean(p));
    if (paths.length) await admin.storage.from(AUDIO_BUCKET).remove(paths);
    const { error } = await admin.from("recordings").delete().eq("contributor_id", uid);
    if (error) throw new Error(error.message);
    for (const r of recs ?? []) revalidatePath(`/entry/${r.entry_id}`);
  }

  // Pending and rejected words are theirs alone; published ones stay.
  const { error: pendErr } = await admin.from("entries").delete().eq("contributor_id", uid).neq("status", "approved");
  if (pendErr) throw new Error(pendErr.message);

  // The same for everything else not yet published, as the privacy page
  // promises: suggestions and reports in review or sent back, and recordings
  // (the person's voice) that were never published, with their files.
  await admin.from("suggestions").delete().eq("contributor_id", uid).neq("status", "approved");
  if (!alsoRecordings) {
    const { data: unpub } = await admin
      .from("recordings")
      .select("id, audio_url")
      .eq("contributor_id", uid)
      .neq("status", "approved");
    const unpubPaths = (unpub ?? []).map((r) => audioPath(r.audio_url)).filter((p): p is string => Boolean(p));
    if (unpubPaths.length) await admin.storage.from(AUDIO_BUCKET).remove(unpubPaths);
    if (unpub?.length) await admin.from("recordings").delete().in("id", unpub.map((r) => r.id));
  }
  // Questions asked of the assistant are kept only until the account goes.
  await admin.from("assistant_usage").delete().or(`user_id.eq.${uid},actor.eq.u:${uid}`);

  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) throw new Error(error.message);

  await supabase.auth.signOut();
  revalidatePath("/");
  revalidatePath("/learn");
  revalidatePath(`/contributor/${uid}`);
  redirect("/?deleted=1");
}

function audioPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${AUDIO_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at < 0) return null;
  try {
    return decodeURIComponent(url.slice(at + marker.length).split("?")[0]) || null;
  } catch {
    return null;
  }
}

/* The × on "N of your edits were accepted": mark them seen, which clears the
   banner and the red dot on the avatar (supabase/approval_notices.sql). */
export async function dismissApprovals() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account");
  await supabase.from("profiles").update({ approvals_seen_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/account");
}

/* The × on "Congratulations, you are now an editor": shown once. */
export async function dismissEditorWelcome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account");
  await supabase.from("profiles").update({ editor_welcomed_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/account");
}

/* Take back one of your own recordings while it is still waiting for an
   editor: you recorded it, listened again, and would rather it did not go
   out. The delete runs as you, so RLS ("recordings own delete",
   supabase/recordings.sql) allows it only for your own rows that are still
   pending; a published recording is an editor's to remove. The file goes
   after the row, with the service role, and only once the row is confirmed
   gone. Two doors: the form on the account page (withdrawRecordingForm,
   which redirects back with a notice) and the recorder's "Remove it"
   (withdrawRecording, which just says whether it worked). */
async function withdraw(id: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !id) return false;

  const { data: gone, error } = await supabase
    .from("recordings")
    .delete()
    .eq("id", id)
    .eq("contributor_id", user.id)
    .eq("status", "pending")
    .select("id, entry_id, audio_url");
  let row = gone?.[0];
  // A take published by the trust window (lib/trust) is no longer pending,
  // so the policy above will not delete it. While no editor has checked it
  // yet, its contributor may still take it back.
  if (!error && !row) {
    const { data: live } = await adminClient()
      .from("recordings")
      .delete()
      .eq("id", id)
      .eq("contributor_id", user.id)
      .eq("status", "approved")
      .is("reviewed_at", null)
      .select("id, entry_id, audio_url");
    row = live?.[0];
  }
  if (error || !row) return false;

  const path = audioPath(row.audio_url);
  if (path) {
    const { error: fileErr } = await adminClient().storage.from(AUDIO_BUCKET).remove([path]);
    if (fileErr) console.error(`recording ${id} withdrawn but file not removed: ${fileErr.message}`);
  }
  revalidatePath("/account");
  revalidatePath("/editor");
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath(`/entry/${row.entry_id}`);
  return true;
}

export async function withdrawRecording(formData: FormData): Promise<{ ok: boolean }> {
  return { ok: await withdraw(String(formData.get("id") ?? "").trim()) };
}

export async function withdrawRecordingForm(formData: FormData) {
  const back = localPath(String(formData.get("back") ?? "").trim(), "/account?show=recordings");
  const ok = await withdraw(String(formData.get("id") ?? "").trim());
  redirect(`${back}${back.includes("?") ? "&" : "?"}${ok ? "withdrawn=1" : "problem=withdraw"}`);
}

/* During the trust window (lib/trust), a recording its contributor has just
   saved goes live at once. The recorder calls this straight after the
   upload. It runs with the service role, but only on the caller's own
   recording, only while it is still pending, and only while the window is
   open. reviewed_at stays empty: that is what keeps it in the editors' queue
   as "live, not yet checked" until one of them keeps it or takes it down. */
export async function publishOwnRecording(formData: FormData): Promise<{ live: boolean }> {
  const { recordingsTrusted } = await import("@/lib/trust");
  if (!recordingsTrusted()) return { live: false };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!user || !id) return { live: false };
  const { data, error } = await adminClient()
    .from("recordings")
    .update({ status: "approved", reviewed_at: null, review_notes: null })
    .eq("id", id)
    .eq("contributor_id", user.id)
    .eq("status", "pending")
    .select("entry_id");
  const row = data?.[0];
  if (error || !row) return { live: false };
  revalidatePath(`/entry/${row.entry_id}`);
  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/improve");
  revalidatePath("/editor");
  return { live: true };
}

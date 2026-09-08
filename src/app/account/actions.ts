"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { AUDIO_BUCKET, AVATAR_BUCKET } from "@/lib/constants";
import { ORIGIN_AREA_CODES, ORIGIN_PRECISIONS } from "@/lib/origins";
import { MAX_RECORDING_NOTE } from "@/lib/constants";

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
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account?show=recordings";
  const withFlag = (flag: string) => `${back}${back.includes("?") ? "&" : "?"}${flag}`;
  if (!id) redirect(back);

  const { data: row, error } = await supabase
    .from("recordings")
    .update({ note })
    .eq("id", id)
    .eq("contributor_id", user.id)
    .select("entry_id")
    .maybeSingle();
  if (error) redirect(withFlag("problem=1"));

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

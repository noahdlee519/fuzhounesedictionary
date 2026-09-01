"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isEditor } from "@/lib/auth";
/* Every write below throws on failure. supabase-js resolves with { error }
   rather than rejecting, so without this a failed approve looked exactly like
   a successful one: the queue re-rendered with the item still in it and no
   message. The route's error boundary renders the thrown message. */
import { adminClient } from "@/lib/supabase/admin";
import { ORIGIN_AREA_CODES } from "@/lib/origins";

async function requireEditor() {
  if (!(await isEditor())) redirect("/");
}

export async function approve(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  const { error } = await adminClient()
    .from("entries")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), review_notes: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/learn");
  revalidatePath("/sitemap.xml");
}

export async function reject(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const { error } = await adminClient()
    .from("entries")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), review_notes: note })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function saveEdit(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  const supabase = adminClient();

  // Update entry core fields.
  const { error: entryErr } = await supabase
    .from("entries")
    .update({
      hanzi: (String(formData.get("hanzi") ?? "").trim() || null),
      romanization: (String(formData.get("romanization") ?? "").trim() || null),
      ipa: (String(formData.get("ipa") ?? "").trim() || null),
      audio_url: (String(formData.get("audio_url") ?? "").trim() || null),
      origin_area: (() => {
        const a = String(formData.get("origin_area") ?? "").trim();
        return ORIGIN_AREA_CODES.includes(a) ? a : null;
      })(),
      origin_locality: (String(formData.get("origin_locality") ?? "").trim() || null),
      notes: (String(formData.get("notes") ?? "").trim() || null),
      headword:
        String(formData.get("romanization") ?? "").trim() ||
        String(formData.get("hanzi") ?? "").trim() ||
        "—",
    })
    .eq("id", id);
  if (entryErr) throw new Error(entryErr.message);

  // Update each existing sense's definition/gloss (ids passed as sense_<id>_field).
  const senseIds = formData.getAll("sense_id").map(String);
  for (const sid of senseIds) {
    const { error: senseErr } = await supabase
      .from("senses")
      .update({
        part_of_speech: String(formData.get(`pos_${sid}`) ?? "").trim() || null,
        definition_en: String(formData.get(`def_${sid}`) ?? "").trim(),
        gloss_zh: String(formData.get(`zh_${sid}`) ?? "").trim() || null,
        example: String(formData.get(`ex_${sid}`) ?? "").trim() || null,
        example_gloss: String(formData.get(`exg_${sid}`) ?? "").trim() || null,
      })
      .eq("id", sid);
    if (senseErr) throw new Error(senseErr.message);
  }

  revalidatePath("/admin");
  revalidatePath(`/entry/${id}`);
  redirect("/admin");
}

export async function approveSuggestion(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  const entryId = String(formData.get("entry_id") ?? "");
  // Setting the status is all this does. The apply_suggestion() trigger copies
  // the value onto the entry or sense, and refuses to overwrite one an editor
  // has already written. See supabase/suggestions.sql.
  const { error } = await adminClient()
    .from("suggestions")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), review_notes: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/improve");
  revalidatePath("/learn");
  if (entryId) revalidatePath(`/entry/${entryId}`);
}

export async function rejectSuggestion(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  const entryId = String(formData.get("entry_id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const { error } = await adminClient()
    .from("suggestions")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), review_notes: note })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/improve");
  if (entryId) revalidatePath(`/entry/${entryId}`);
}

export async function approveRecording(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  const entryId = String(formData.get("entry_id") ?? "");
  const { error } = await adminClient()
    .from("recordings")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), review_notes: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/improve");
  if (entryId) revalidatePath(`/entry/${entryId}`);
}

export async function rejectRecording(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  const entryId = String(formData.get("entry_id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const { error } = await adminClient()
    .from("recordings")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), review_notes: note })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  if (entryId) revalidatePath(`/entry/${entryId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isEditor } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

async function requireEditor() {
  if (!(await isEditor())) redirect("/");
}

export async function approve(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  await adminClient()
    .from("entries")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), review_notes: null })
    .eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/browse");
}

export async function reject(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim() || null;
  await adminClient()
    .from("entries")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), review_notes: note })
    .eq("id", id);
  revalidatePath("/admin");
}

export async function saveEdit(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id"));
  const supabase = adminClient();

  // Update entry core fields.
  await supabase
    .from("entries")
    .update({
      hanzi: (String(formData.get("hanzi") ?? "").trim() || null),
      romanization: (String(formData.get("romanization") ?? "").trim() || null),
      ipa: (String(formData.get("ipa") ?? "").trim() || null),
      audio_url: (String(formData.get("audio_url") ?? "").trim() || null),
      variety: (String(formData.get("variety") ?? "").trim() || null),
      notes: (String(formData.get("notes") ?? "").trim() || null),
      headword:
        String(formData.get("romanization") ?? "").trim() ||
        String(formData.get("hanzi") ?? "").trim() ||
        "—",
    })
    .eq("id", id);

  // Update each existing sense's definition/gloss (ids passed as sense_<id>_field).
  const senseIds = formData.getAll("sense_id").map(String);
  for (const sid of senseIds) {
    await supabase
      .from("senses")
      .update({
        part_of_speech: String(formData.get(`pos_${sid}`) ?? "").trim() || null,
        definition_en: String(formData.get(`def_${sid}`) ?? "").trim(),
        gloss_zh: String(formData.get(`zh_${sid}`) ?? "").trim() || null,
        example: String(formData.get(`ex_${sid}`) ?? "").trim() || null,
        example_gloss: String(formData.get(`exg_${sid}`) ?? "").trim() || null,
      })
      .eq("id", sid);
  }

  revalidatePath("/admin");
  revalidatePath(`/entry/${id}`);
  redirect("/admin");
}

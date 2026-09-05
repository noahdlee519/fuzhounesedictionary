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
import { AUDIO_BUCKET, PARTS_OF_SPEECH } from "@/lib/constants";

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

  // Update each existing sense (fields arrive as pos_<id>, def_<id>, …). The
  // senses are independent rows, so the updates go out together. A blank
  // part of speech, or one not on the list, is stored as none.
  const senseIds = formData.getAll("sense_id").map(String);
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const results = await Promise.all(
    senseIds.map((sid) => {
      const pos = field(`pos_${sid}`);
      return supabase
        .from("senses")
        .update({
          part_of_speech: (PARTS_OF_SPEECH as readonly string[]).includes(pos) ? pos : null,
          definition_en: field(`def_${sid}`),
          gloss_zh: field(`zh_${sid}`) || null,
          example: field(`ex_${sid}`) || null,
          example_gloss: field(`exg_${sid}`) || null,
        })
        .eq("id", sid)
        .eq("entry_id", id);
    })
  );
  const senseErr = results.find((r) => r.error)?.error;
  if (senseErr) throw new Error(senseErr.message);

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

/* Remove a recording outright — row and file — whatever its status. Reject
   keeps the row (with a note, and it still counts toward the contributor's
   two-per-word cap); this is for takes that should not exist at all: spam,
   the wrong word, something a contributor asked to have taken down.

   The row goes first. If the file removal then fails the recording is still
   gone from the site, and an orphaned object in the bucket is a cleanup job,
   not a bug a visitor can see. */
export async function deleteRecording(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("back") ?? "/admin");
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/admin";
  if (!id) redirect(back);

  const supabase = adminClient();
  const { data: row, error: readErr } = await supabase
    .from("recordings")
    .select("id, entry_id, audio_url, contributor_id")
    .eq("id", id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!row) redirect(back); // already gone

  const { error: delErr } = await supabase.from("recordings").delete().eq("id", id);
  if (delErr) throw new Error(delErr.message);

  // Only files in our own bucket are removed; a pasted external link is not ours.
  const path = storagePath(row.audio_url);
  if (path) {
    const { error: fileErr } = await supabase.storage.from(AUDIO_BUCKET).remove([path]);
    if (fileErr) console.error(`recording ${id} deleted but file not removed: ${fileErr.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/improve");
  revalidatePath("/learn");
  revalidatePath("/");
  revalidatePath(`/entry/${row.entry_id}`);
  if (row.contributor_id) revalidatePath(`/contributor/${row.contributor_id}`);
  redirect(back);
}

/* "https://xyz.supabase.co/storage/v1/object/public/audio/<uid>/<file>" → "<uid>/<file>".
   Anything not shaped like a public URL for our bucket returns null. */
function storagePath(url: string | null): string | null {
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

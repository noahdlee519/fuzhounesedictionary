import type { SupabaseClient } from "@supabase/supabase-js";
import { AUDIO_BUCKET, MAX_AUDIO_BYTES, MAX_RECORDING_NOTE } from "@/lib/constants";
import { baseMime, extFor } from "@/components/useRecorder";

/* Put a take in the audio bucket and a row in `recordings`. Shared by the
   entry page / Improve list (save at once) and the Add a word form (save
   after the word exists). Errors are thrown with a sentence a person can
   read; the database's own rate-limit messages are written that way too. */
export async function saveRecording(
  supabase: SupabaseClient,
  args: {
    userId: string;
    entryId: string;
    kind: "headword" | "example";
    senseId?: string | null;
    blob: Blob;
    seconds: number;
    note: string;
  }
): Promise<{ id: string; note: string }> {
  const { userId, entryId, kind, senseId, blob, seconds } = args;
  if (blob.size > MAX_AUDIO_BYTES) {
    throw new Error("That recording is too long. Keep it under 5 MB.");
  }
  const mime = baseMime(blob.type || "audio/webm");
  const path = `${userId}/${entryId}-${kind}-${Date.now()}.${extFor(mime)}`;

  const { error: upErr } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, blob, { contentType: mime, upsert: false });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
  const note = args.note.trim().slice(0, MAX_RECORDING_NOTE);

  const { data: inserted, error: insErr } = await supabase
    .from("recordings")
    .insert({
      entry_id: entryId,
      kind,
      sense_id: kind === "example" ? senseId ?? null : null,
      audio_url: pub.publicUrl,
      seconds,
      note: note || null,
      contributor_id: userId,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  return { id: inserted.id as string, note };
}

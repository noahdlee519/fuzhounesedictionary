import type { SupabaseClient } from "@supabase/supabase-js";
import { AUDIO_BUCKET, MAX_AUDIO_BYTES, MAX_RECORDING_NOTE } from "@/lib/constants";
import { baseMime, extFor } from "@/components/useRecorder";

/* The page's language, for the messages thrown below (this runs in the
   browser; the root layout sets <html lang>). */
const zh = () => typeof document !== "undefined" && document.documentElement.lang.startsWith("zh");

export interface Speaker {
  name: string;
  /** An origin area code (lib/origins), or "" for not known. */
  area: string;
  locality?: string;
}

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
    /** Someone other than the account holder is speaking: their name as it
     *  should be shown, and where their Fuzhounese is from
     *  (supabase/recording_speaker.sql). Absent: the account holder. */
    speaker?: Speaker | null;
  }
): Promise<{ id: string; note: string }> {
  const { userId, entryId, kind, senseId, blob, seconds } = args;
  if (blob.size > MAX_AUDIO_BYTES) {
    throw new Error(zh() ? "錄音太長了，請控制在 5 MB 以內。" : "That recording is too long. Keep it under 5 MB.");
  }
  const mime = baseMime(blob.type || "audio/webm");
  const path = `${userId}/${entryId}-${kind}-${Date.now()}.${extFor(mime)}`;

  const { error: upErr } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, blob, { contentType: mime, upsert: false });
  if (upErr) throw new Error(`${zh() ? "上傳失敗：" : "Upload failed: "}${upErr.message}`);

  const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
  const note = args.note.trim().slice(0, MAX_RECORDING_NOTE);
  const speakerName = args.speaker?.name.trim().slice(0, 60) || "";

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
      // Only sent when someone else is speaking, so a recording of oneself
      // still saves before the speaker migration has been run.
      ...(speakerName
        ? { speaker_name: speakerName, origin_area: args.speaker?.area || null, origin_locality: args.speaker?.locality?.trim() || null }
        : {}),
    })
    .select("id")
    .single();
  if (insErr) {
    if (speakerName && /speaker_name/.test(insErr.message)) {
      throw new Error(zh() ? "還不能替別人錄音。請選「我」存成你自己的錄音，或稍後再試。" : "Recording someone else is not switched on yet. Choose “Me” to save it as your own, or try again later.");
    }
    throw new Error(insErr.message);
  }
  return { id: inserted.id as string, note };
}

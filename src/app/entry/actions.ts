"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  if (!user || !id || (value !== 1 && value !== -1)) redirect(back);

  const { data: mine } = await supabase
    .from("recording_votes")
    .select("value")
    .eq("recording_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mine && mine.value === value) {
    await supabase.from("recording_votes").delete().eq("recording_id", id).eq("user_id", user.id);
  } else {
    await supabase
      .from("recording_votes")
      .upsert({ recording_id: id, user_id: user.id, value }, { onConflict: "recording_id,user_id" });
  }

  revalidatePath(back.split("#")[0]);
  redirect(back);
}

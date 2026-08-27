"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, isEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

// Create a request (or, if one already exists for this word/entry, just upvote it).
export async function requestWord(formData: FormData) {
  const { user } = await getSessionUser();
  const back = String(formData.get("back") ?? "/wanted") || "/wanted";
  if (!user) redirect(back);

  const term = String(formData.get("term") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const entryId = String(formData.get("entry_id") ?? "").trim() || null;
  if (!term && !entryId) redirect(back);

  const supabase = createClient();

  // Is there already an OPEN request for this entry / term? If so, vote instead.
  let existingId: string | null = null;
  if (entryId) {
    const { data } = await supabase
      .from("word_requests").select("id")
      .eq("entry_id", entryId).eq("status", "open").maybeSingle();
    existingId = data?.id ?? null;
  } else {
    const { data } = await supabase
      .from("word_requests").select("id")
      .is("entry_id", null).eq("status", "open").ilike("term", term).maybeSingle();
    existingId = data?.id ?? null;
  }

  if (!existingId) {
    const { data } = await supabase
      .from("word_requests")
      .insert({ term: term || "(pronunciation)", entry_id: entryId, note, requested_by: user.id })
      .select("id").single();
    existingId = data?.id ?? null;
  }

  if (existingId) {
    await supabase
      .from("word_request_votes")
      .upsert({ request_id: existingId, user_id: user.id }, { onConflict: "request_id,user_id", ignoreDuplicates: true });
  }

  revalidatePath("/wanted");
  revalidatePath("/");
  redirect(back);
}

// Add my vote to an existing request (idempotent).
export async function voteRequest(formData: FormData) {
  const { user } = await getSessionUser();
  if (!user) redirect("/wanted");
  const id = String(formData.get("id"));
  const supabase = createClient();
  await supabase
    .from("word_request_votes")
    .upsert({ request_id: id, user_id: user.id }, { onConflict: "request_id,user_id", ignoreDuplicates: true });
  revalidatePath("/wanted");
}

// Editor-only: mark a request fulfilled (a recording / entry now exists).
export async function fulfillRequest(formData: FormData) {
  if (!(await isEditor())) redirect("/");
  const { user } = await getSessionUser();
  const id = String(formData.get("id"));
  await adminClient()
    .from("word_requests")
    .update({ status: "fulfilled", fulfilled_at: new Date().toISOString(), fulfilled_by: user?.id ?? null })
    .eq("id", id);
  revalidatePath("/wanted");
  revalidatePath("/");
}

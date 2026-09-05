"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, isEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

// Create a request (or, if one already exists for this word/entry, just upvote it).
export async function requestWord(formData: FormData) {
  const { user } = await getSessionUser();
  // `back` comes from the form, so only a path on this site is honoured —
  // the same guard as auth/callback. "//evil.com" and "https://…" fall back.
  const raw = String(formData.get("back") ?? "/request");
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/request";
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
    const { data, error } = await supabase
      .from("word_requests")
      .insert({ term: term || "(pronunciation)", entry_id: entryId, note, requested_by: user.id })
      .select("id").single();
    if (error) {
      // Rate limits are raised by a database trigger; the message is written for
      // the person reading it. Anything else gets a generic line.
      // 23505 = the unique index on open requests: someone (or a double click)
      // got there first. That is not a failure worth alarming anyone about.
      const message =
        error.code === "23505"
          ? "That word has already been requested — your vote has been added."
          : /limit|short time/i.test(error.message)
            ? error.message
            : "That request could not be saved. Please try again.";
      redirect(`${back}?notice=${encodeURIComponent(message)}`);
    }
    existingId = data?.id ?? null;
  }

  if (existingId) {
    const { error } = await supabase
      .from("word_request_votes")
      .upsert({ request_id: existingId, user_id: user.id }, { onConflict: "request_id,user_id", ignoreDuplicates: true });
    if (error) redirect(`${back}?notice=${encodeURIComponent("Your vote could not be saved. Please try again.")}`);
  }

  revalidatePath("/request");
  revalidatePath("/");
  redirect(back);
}

// Add my vote to an existing request (idempotent).
export async function voteRequest(formData: FormData) {
  const { user } = await getSessionUser();
  if (!user) redirect("/request");
  const id = String(formData.get("id"));
  const supabase = createClient();
  const { error } = await supabase
    .from("word_request_votes")
    .upsert({ request_id: id, user_id: user.id }, { onConflict: "request_id,user_id", ignoreDuplicates: true });
  // supabase-js resolves with { error } rather than rejecting; a swallowed
  // failure looked like a vote that silently did not count.
  if (error) redirect(`/request?notice=${encodeURIComponent("Your vote could not be saved. Please try again.")}`);
  revalidatePath("/request");
}

// Editor-only: mark a request fulfilled (a recording / entry now exists).
export async function fulfillRequest(formData: FormData) {
  if (!(await isEditor())) redirect("/");
  const { user } = await getSessionUser();
  const id = String(formData.get("id"));
  const { error } = await adminClient()
    .from("word_requests")
    .update({ status: "fulfilled", fulfilled_at: new Date().toISOString(), fulfilled_by: user?.id ?? null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/request");
  revalidatePath("/");
}

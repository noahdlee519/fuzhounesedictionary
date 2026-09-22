"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, isEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { localPath } from "@/lib/local-path";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

// Create a request (or, if one already exists for this word/entry, just upvote it).
export async function requestWord(formData: FormData) {
  const { user } = await getSessionUser();
  const L = pick(getLang());
  // `back` comes from the form, so only a path on this site is honoured —
  // the same guard as auth/callback. "//evil.com" and "https://…" fall back.
  const raw = String(formData.get("back") ?? "/request");
  const back = localPath(raw, "/request");
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
          ? L("That word has already been requested—your vote has been added.", "這個詞已經有人請求過了——已替你投上一票。")
          : /limit|short time/i.test(error.message)
            ? error.message
            : L("That request could not be saved. Please try again.", "請求未能儲存，請再試一次。");
      redirect(`${back}?notice=${encodeURIComponent(message)}`);
    }
    existingId = data?.id ?? null;
  }

  if (existingId) {
    const { error } = await supabase
      .from("word_request_votes")
      .upsert({ request_id: existingId, user_id: user.id }, { onConflict: "request_id,user_id", ignoreDuplicates: true });
    if (error) redirect(`${back}?notice=${encodeURIComponent(L("Your vote could not be saved. Please try again.", "你的投票未能儲存，請再試一次。"))}`);
  }

  revalidatePath("/request");
  revalidatePath("/");
  redirect(back);
}

// Vote for a request, or — pressed again — take the vote back. A request can
// go down to 0, including the requester's own automatic vote.
export async function voteRequest(formData: FormData) {
  const { user } = await getSessionUser();
  if (!user) redirect("/request");
  const id = String(formData.get("id"));
  const supabase = createClient();
  const { data: mine } = await supabase
    .from("word_request_votes")
    .select("request_id")
    .eq("request_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  // RLS lets a person delete only their own vote (word_requests.sql).
  const { error } = mine
    ? await supabase.from("word_request_votes").delete().eq("request_id", id).eq("user_id", user.id)
    : await supabase
        .from("word_request_votes")
        .upsert({ request_id: id, user_id: user.id }, { onConflict: "request_id,user_id", ignoreDuplicates: true });
  // supabase-js resolves with { error } rather than rejecting; a swallowed
  // failure looked like a vote that silently did not count.
  // Where the vote was cast: the Request page (default), or a "Most
  // requested" list on the home or Contribute page.
  const back = localPath(String(formData.get("back") ?? "/request"), "/request");
  if (error) {
    // Called from the ▲ button (no `back`), a redirect would pull the person
    // off the page; the button's count is put right by the refresh instead.
    console.error(`request vote on ${id} failed: ${error.message}`);
    if (formData.get("back")) redirect(`/request?notice=${encodeURIComponent(pick(getLang())("Your vote could not be saved. Please try again.", "你的投票未能儲存，請再試一次。"))}`);
  }
  revalidatePath("/request");
  revalidatePath("/contribute");
  revalidatePath("/");
  if (formData.get("back")) redirect(back);
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

// Editor-only: remove a request outright (spam, a duplicate, a joke). Its
// votes go with it (on delete cascade).
export async function deleteRequest(formData: FormData) {
  if (!(await isEditor())) redirect("/");
  const id = String(formData.get("id") ?? "");
  const back = localPath(String(formData.get("back") ?? "/"), "/");
  if (id) {
    const { error } = await adminClient().from("word_requests").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/request");
  revalidatePath("/contribute");
  revalidatePath("/");
  redirect(back);
}

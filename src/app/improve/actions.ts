"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* One action for both kinds of suggestion.

   Nothing here decides whether the suggestion is published — the database does
   that. prepare_suggestion() forces a non-editor's row to 'pending' whatever
   this code sends, and apply_suggestion() copies the value onto the entry only
   when an editor approves it. So a bug in this file cannot put unreviewed text
   on the site. */

const MAX = 500;

export async function suggest(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/improve");

  const kind = String(formData.get("kind") ?? "");
  const entryId = String(formData.get("entry_id") ?? "");
  const senseId = String(formData.get("sense_id") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim().slice(0, MAX);
  const gloss = String(formData.get("value_gloss") ?? "").trim().slice(0, MAX);

  const back = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params);
    redirect(`/improve?${qs}#w-${entryId}`);
  };

  if (kind !== "ipa" && kind !== "example") back({ problem: "That is not something you can suggest." });
  if (!entryId) back({ problem: "That word could not be found." });
  if (!value) back({ problem: "Nothing was filled in." });
  if (kind === "example" && !senseId) {
    back({ problem: "Please say which meaning the sentence is for." });
  }

  const { error } = await supabase.from("suggestions").insert({
    entry_id: entryId,
    kind,
    sense_id: kind === "example" ? senseId : null,
    value,
    value_gloss: kind === "example" && gloss ? gloss : null,
    contributor_id: user.id,
  });

  if (error) {
    // The rate-limit and length messages are written to be read by a person,
    // so pass them straight through rather than replacing them with our own.
    const dupe = error.code === "23505";
    back({ problem: dupe ? "You have already suggested that for this word." : error.message });
  }

  revalidatePath("/improve");
  back({ sent: kind });
}

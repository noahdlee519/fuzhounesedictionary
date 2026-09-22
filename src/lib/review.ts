import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { TRUST_RECORDINGS_FROM } from "@/lib/trust";

/* How many things are waiting for an editor: pending words, recordings and
   suggestions (edits and reports included). Shown on the Review tab and as
   the red counter on Contribute in the header and the footer (cache():
   counted once per page, however many places show it). A queue whose table is
   missing (a migration not yet run) counts as empty. */
export const reviewCount = cache(async function reviewCount(): Promise<number> {
  const supabase = createClient();
  const head = (table: string) =>
    supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
  // Plus recordings that went live in the trust window and no editor has
  // checked yet (lib/trust): still work waiting, though already public.
  const unchecked = supabase
    .from("recordings")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved")
    .is("reviewed_at", null)
    .gte("created_at", TRUST_RECORDINGS_FROM);
  const results = await Promise.all([head("entries"), head("recordings"), head("suggestions"), unchecked]);
  return results.reduce((n, r) => n + (r.error ? 0 : r.count ?? 0), 0);
});

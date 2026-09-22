import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/* How many things are waiting for an editor: pending words, recordings and
   suggestions (edits and reports included). Shown on the Review tab and as
   the red counter on Contribute in the header and the footer (cache():
   counted once per page, however many places show it). A queue whose table is
   missing (a migration not yet run) counts as empty. */
export const reviewCount = cache(async function reviewCount(): Promise<number> {
  const supabase = createClient();
  const head = (table: string) =>
    supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
  const results = await Promise.all([head("entries"), head("recordings"), head("suggestions")]);
  return results.reduce((n, r) => n + (r.error ? 0 : r.count ?? 0), 0);
});

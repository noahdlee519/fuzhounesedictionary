"use server";

import { verifiedUser } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { storeReading } from "@/lib/pinyin";

/* After a word is added: store its Mandarin reading, so search finds it by
   pinyin ("dingbianhu" → 鼎邊糊). Only for the person's own word. */
export async function readMandarin(entryId: string): Promise<void> {
  const user = await verifiedUser();
  if (!user || typeof entryId !== "string" || !entryId) return;
  const db = adminClient();
  const { data } = await db.from("entries").select("hanzi, contributor_id").eq("id", entryId).maybeSingle();
  if (!data || data.contributor_id !== user.id) return;
  await storeReading(db, entryId, data.hanzi);
}

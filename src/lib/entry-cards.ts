import "server-only";
import { createClient } from "@/lib/supabase/server";
import { firstSense } from "@/lib/entries";

/* The small word cards under an assistant answer: characters, romanization,
   the first English meaning, and something to play. Built from the entry
   links the answer contains (/entry/<uuid>), in the order they appear, at
   most `limit` of them. Public data only (approved entries and recordings),
   read as the visitor. */
export interface EntryCard {
  id: string;
  hanzi: string | null;
  romanization: string;
  gloss: string | null;
  audio: string | null;
}

const UUID = /\/entry\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g;

/** Entry ids linked in a piece of text, first appearance first, no repeats. */
export function linkedEntryIds(text: string): string[] {
  const seen: string[] = [];
  for (const m of text.matchAll(UUID)) if (!seen.includes(m[1])) seen.push(m[1]);
  return seen;
}

export async function entryCards(ids: string[], limit = 4): Promise<EntryCard[]> {
  const want = ids.slice(0, limit);
  if (!want.length) return [];
  const supabase = createClient();
  const [{ data: rows }, { data: recs }] = await Promise.all([
    supabase
      .from("entries")
      .select("id, hanzi, romanization, headword, audio_url, senses(definition_en, sort)")
      .eq("status", "approved")
      .in("id", want),
    supabase
      .from("recordings")
      .select("entry_id, audio_url, created_at")
      .eq("status", "approved")
      .in("entry_id", want)
      .order("created_at", { ascending: true }),
  ]);
  // The first approved take on each word, or the entry's own file.
  const take = new Map<string, string>();
  for (const r of (recs ?? []) as { entry_id: string; audio_url: string | null }[]) {
    if (r.audio_url && !take.has(r.entry_id)) take.set(r.entry_id, r.audio_url);
  }
  const byId = new Map(((rows ?? []) as any[]).map((e) => [e.id, e]));
  return want
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((e: any) => ({
      id: e.id,
      hanzi: e.hanzi ?? null,
      romanization: e.romanization || e.headword,
      gloss: firstSense<any>(e.senses)?.definition_en ?? null,
      audio: take.get(e.id) ?? e.audio_url ?? null,
    }));
}


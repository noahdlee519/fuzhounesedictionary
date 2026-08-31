export type EntryStatus = "pending" | "approved" | "rejected";

export interface Sense {
  id: string;
  entry_id: string;
  part_of_speech: string | null;
  definition_en: string;
  gloss_zh: string | null;
  example: string | null;
  example_gloss: string | null;
  sort: number;
}

export interface Profile {
  id: string;
  display_name: string | null;
  is_editor: boolean;
  origin_area: string | null;
  origin_locality: string | null;
  origin_precision: "hidden" | "area" | "locality";
  created_at: string;
}

export interface Entry {
  id: string;
  headword: string;
  hanzi: string | null;
  romanization: string | null;
  ipa: string | null;
  audio_url: string | null;
  notes: string | null;
  variety: string | null;
  origin_area: string | null;
  origin_locality: string | null;
  status: EntryStatus;
  contributor_id: string | null;
  review_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface EntryWithSenses extends Entry {
  senses: Sense[];
  contributor?: { id: string; display_name: string | null } | null;
}

// Shape returned by the search_entries() RPC (one row per entry + a short gloss).
export interface SearchRow {
  id: string;
  headword: string;
  hanzi: string | null;
  romanization: string | null;
  ipa: string | null;
  audio_url: string | null;
  notes: string | null;
  variety: string | null;
  status: EntryStatus;
  contributor_id: string | null;
  created_at: string;
  short_gloss: string | null;
  pos: string | null;
  origin_area: string | null;
  origin_locality: string | null;
}

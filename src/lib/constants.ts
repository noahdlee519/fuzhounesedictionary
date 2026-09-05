export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "numeral",
  "measure word",
  "particle",
  "phrase",
  "proper noun",
] as const;

export const LICENSE = {
  name: "CC BY-SA 4.0",
  url: "https://creativecommons.org/licenses/by-sa/4.0/",
};

export const AUDIO_BUCKET = "audio";
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB (FR-12)

/* How many recordings one person may leave on one word — the word on its own
   and in a sentence, or two tries at the word. Enforced by the database
   (supabase/recording_cap.sql); this copy is for hiding the record button
   once it is reached. Rejected takes do not count. Change both together. */
export const MAX_RECORDINGS_PER_WORD = 2;

/* A note left with a recording — the sentence read, or a usage remark. The
   database enforces the same cap (supabase/recording_note.sql); change both. */
export const MAX_RECORDING_NOTE = 300;

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

/* Raster formats only. An SVG can carry script, and avatars are served from a
   public bucket, so allowing them would hand anyone a hosted XSS.
   This list mirrors allowed_mime_types on the avatars bucket, set in
   supabase/avatars.sql — that file is the enforcement, this is the friendly
   message beforehand. Change both together. */
export const AVATAR_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
] as const;

export const AVATAR_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

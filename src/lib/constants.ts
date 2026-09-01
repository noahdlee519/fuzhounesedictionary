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
  "other",
] as const;

export const LICENSE = {
  name: "CC BY-SA 4.0",
  url: "https://creativecommons.org/licenses/by-sa/4.0/",
};

export const AUDIO_BUCKET = "audio";
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB (FR-12)

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

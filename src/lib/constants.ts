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

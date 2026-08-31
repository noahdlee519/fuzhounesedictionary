import type { CardProps } from "@/components/EntryCard";

/** The first sense of an entry, by sort order. */
export function firstSense(senses: any[] | null | undefined) {
  if (!senses || senses.length === 0) return null;
  return [...senses].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0];
}

/** Map an entries row (with its senses joined) onto an EntryCard. */
export function toCard(e: any): CardProps {
  const s = firstSense(e.senses);
  return {
    id: e.id,
    hanzi: e.hanzi,
    romanization: e.romanization,
    headword: e.headword,
    pos: s?.part_of_speech ?? null,
    gloss: s?.definition_en ?? null,
    hasAudio: Boolean(e.audio_url),
  };
}

/** "福州 · Hók-ciŭ" — the word as a human would name it in a page title. */
export function entryTitle(e: {
  hanzi?: string | null;
  romanization?: string | null;
  headword: string;
}): string {
  const roman = e.romanization || e.headword;
  return e.hanzi ? `${e.hanzi} · ${roman}` : roman;
}

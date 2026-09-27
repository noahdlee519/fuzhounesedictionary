/* Parts of speech are stored in English (src/lib/constants PARTS_OF_SPEECH);
   a Chinese reader gets these. Anything not listed shows as stored. */
export const POS_ZH: Record<string, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  pronoun: "代詞",
  numeral: "數詞",
  "measure word": "量詞",
  particle: "助詞",
  phrase: "片語",
  "proper noun": "專有名詞",
};

export function posText(pos: string, lang: string): string {
  return lang === "zh" ? POS_ZH[pos] ?? pos : pos;
}

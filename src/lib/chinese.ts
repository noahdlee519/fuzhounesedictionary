import "server-only";
import * as OpenCC from "opencc-js/cn2t";

/* Simplified characters to traditional, for search.

   Every headword here is written in traditional characters, so a visitor who
   types simplified (most Mandarin speakers) used to find a word only when one
   of its meanings happened to carry a simplified Mandarin gloss: 饭 found 飯,
   but 鸡, 猫, 门 and 汤 missed 雞, 貓, 門 and 湯 (checked on the live site,
   22 Sep 2026).

   OpenCC's simplified→traditional table (cn2t subset, server-only, never sent
   to the browser). A few simplified characters stand for more than one
   traditional one — 干 for 乾/幹/干, 里 for 里/裏 — so the search runs on what
   was typed as well as on the conversion, and merges the two; converting can
   only add results, never lose one. */
let convert: ((s: string) => string) | null = null;

export function toTraditional(s: string): string {
  // Nothing to do for a query with no CJK in it (English, romanization).
  if (!/[㐀-鿿豈-﫿]/.test(s)) return s;
  try {
    convert ??= OpenCC.Converter({ from: "cn", to: "t" });
    return convert(s);
  } catch {
    return s;
  }
}

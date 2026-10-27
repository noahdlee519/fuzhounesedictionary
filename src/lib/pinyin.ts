import "server-only";
import { pinyin } from "pinyin-pro";
import * as OpenCC from "opencc-js/t2cn";

/* A word's Mandarin reading, for search: someone who knows 鼎邊糊 as
   "dingbianhu" can type that and find diāng-biĕng-gù.

   Stored on the entry (entries.pinyin, supabase/search_pinyin.sql) the same
   way search compares romanization: no tone marks, no spaces, lower case —
   "dingbianhu". ü is kept both ways people type it, as u and as v ("lu lv").

   The characters go to simplified first: pinyin-pro reads simplified text
   best, and on traditional it misreads common words (火車 as huoju, 銀行 as
   yinxing; with the conversion, huoche and yinhang — checked against
   Wiktionary's readings, 27 Oct 2026). A word with a character it cannot
   read (Fuzhou-only characters such as 𡳞) gets no reading at all, rather
   than a reading of only some of its syllables. */
let toSimplified: ((s: string) => string) | null = null;

const HAN = /\p{Script=Han}/u;

export function mandarinReading(hanzi: string | null | undefined): string | null {
  const chars = Array.from(hanzi ?? "").filter((c) => HAN.test(c));
  if (!chars.length) return null;
  let text = chars.join("");
  try {
    toSimplified ??= OpenCC.Converter({ from: "tw", to: "cn" });
    text = toSimplified(text);
  } catch {
    /* read the characters as written */
  }
  let syllables: string[];
  try {
    syllables = pinyin(text, { toneType: "none", type: "array" });
  } catch {
    return null;
  }
  if (syllables.length !== Array.from(text).length || !syllables.every((s) => /^[a-zü]+$/.test(s))) return null;
  const word = syllables.join("");
  return word.includes("ü") ? `${word.replace(/ü/g, "u")} ${word.replace(/ü/g, "v")}` : word;
}

/* Writes a word's reading if it has none. Never overwrites one: the readings
   from Wiktionary (search_pinyin.sql) list every way a word is read, and a
   change to the characters clears the old reading in the database (trigger
   entries_pinyin_reset), so a missing reading is the only one to fill.
   Best effort and silent: search works without it, and before
   search_pinyin.sql has been run the column does not exist. */
export async function storeReading(
  db: { from: (t: string) => any },
  id: string,
  hanzi?: string | null
): Promise<void> {
  try {
    if (hanzi === undefined) {
      const { data } = await db.from("entries").select("hanzi").eq("id", id).maybeSingle();
      hanzi = data?.hanzi ?? null;
    }
    const reading = mandarinReading(hanzi);
    if (!reading) return;
    await db.from("entries").update({ pinyin: reading }).eq("id", id).is("pinyin", null);
  } catch {
    /* search simply goes without this word's reading */
  }
}

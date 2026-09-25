/* Romanization: Bàng-uâ-cê (BUC, 平話字) and Yngping (榕拼).

   Every word here is stored in whatever spelling its source used — most in
   BUC, from Wiktionary. A reader can choose to see Yngping instead
   (RomToggle, cookie "{ROM_COOKIE}"); this converts a BUC spelling syllable by
   syllable. A spelling that is not BUC (tone numbers like seik21, a
   contributor's own system) does not convert and is shown as entered.

   The table is from Yngdieng 榕典 (github.com/zingzeu/yngdieng, MIT licence,
   (c) 2020 Yngdieng Authors): server/common/FoochowRomanizedUtils.cs for the
   BUC spelling of each rime in each tone, YngpingBekinUtil.cs for the
   Yngping spelling. One change: the 東/初 rimes are oe/oeng/oek/oeh, as in the
   newer Fuzhounese-IME data, not Yngdieng's older eo/eong. Measured against
   the Wiktionary import on 25 Sep 2026: 99.7% of words convert
   (scripts/romanization/, and the Project doc claude/romanization-yngping.md).

   Both systems write each syllable's citation form, not the sandhi heard in
   a phrase. Yngping's digits are tone CATEGORIES (1 上平, 2 上上, 3 上去,
   4 上入, 5 下平, 7 下去, 8 下入), not the pitch numbers used elsewhere here. */

export type RomSystem = "buc" | "yngping";
export const ROM_COOKIE = "rom";
export const ROM_SYSTEMS: { key: RomSystem; label: string; short: string }[] = [
  { key: "buc", label: "Bàng-uâ-cê", short: "BUC" },
  { key: "yngping", label: "Yngping", short: "榕拼" },
];

// Rime: its BUC spelling in the seven tones (上平 上上 上去 上入 下平 下去 下入),
// then its Yngping spelling in open and in checked (-h/-k) syllables.
type Row = [string | null, string | null, string | null, string | null, string | null, string | null, string | null, string, string | null];
const RIMES: Record<string, Row> = {
  Ung: ["ŭng", "ūng", "óng", "ók", "ùng", "ông", "ŭk", "ung", "uk"],
  Ua: ["uă", "uā", "uá", "uáh", "uà", "uâ", "uăh", "ua", "uah"],
  Yong: ["iŏng", "iōng", "ióng", "iók", "iòng", "iông", "iŏk", "iong", "iok"],
  Iu: ["iŭ", "iū", "éu", "éuh", "iù", "êu", null, "iu", null],
  Ang: ["ăng", "āng", "áng", "ák", "àng", "âng", "ăk", "ang", "ak"],
  Ai: ["ăi", "āi", "ái", "áih", "ài", "âi", "ăih", "ai", null],
  A: ["ă", "ā", "á", "áh", "à", "â", "ăh", "a", "ah"],
  Ing: ["ĭng", "īng", "éng", "ék", "ìng", "êng", "ĭk", "ing", "ik"],
  Uang: ["uăng", "uāng", "uáng", "uák", "uàng", "uâng", "uăk", "uang", "uak"],
  O: ["ŏ̤", "ō̤", "ó̤", "ó̤h", "ò̤", "ô̤", "ŏ̤h", "o", "oh"],
  Y: ["ṳ̆", "ṳ̄", "é̤ṳ", "é̤ṳh", "ṳ̀", "ê̤ṳ", "ṳ̆h", "y", "yh"],
  Uoi: ["uŏi", "uōi", "uói", "uóih", "uòi", "uôi", null, "uoi", null],
  U: ["ŭ", "ū", "ó", "óh", "ù", "ô", "ŭh", "u", "uh"],
  Eing: ["ĕng", "ēng", "áing", "áik", "èng", "âing", "ĕk", "eng", "ek"],
  Uong: ["uŏng", "uōng", "uóng", "uók", "uòng", "uông", "uŏk", "uong", "uok"],
  Ui: ["ŭi", "ūi", "ói", "óih", "ùi", "ôi", "ŭih", "ui", null],
  Ieu: ["iĕu", "iēu", "iéu", "iéuh", "ièu", "iêu", null, "ieu", null],
  Yng: ["ṳ̆ng", "ṳ̄ng", "é̤ṳng", "é̤ṳk", "ṳ̀ng", "ê̤ṳng", "ṳ̆k", "yng", "yk"],
  Ong: ["ŏng", "ōng", "áung", "áuk", "òng", "âung", "ŏk", "ong", "ok"],
  I: ["ĭ", "ī", "é", "éh", "ì", "ê", "ĭh", "i", "ih"],
  Oeng: ["ĕ̤ng", "ē̤ng", "áe̤ng", "áe̤k", "è̤ng", "âe̤ng", "ĕ̤k", "oeng", "oek"],
  Au: ["ău", "āu", "áu", "áuh", "àu", "âu", "ăuh", "au", null],
  Uo: ["uŏ", "uō", "uó", "uóh", "uò", "uô", "uŏh", "uo", "uoh"],
  E: ["ă̤", "ā̤", "á̤", "á̤h", "à̤", "â̤", "ă̤h", "e", "eh"],
  Io: ["iŏ", "iō", "ió", "ióh", "iò", "iô", "iŏh", "io", "ioh"],
  Ie: ["iĕ", "iē", "ié", "iéh", "iè", "iê", "iĕh", "ie", "ieh"],
  Iang: ["iăng", "iāng", "iáng", "iák", "iàng", "iâng", "iăk", "iang", "iak"],
  Oey: ["ŏi", "ōi", "ó̤i", "ó̤ih", "òi", "ô̤i", "ŏih", "oi", null],
  Oe: ["ĕ̤", "ē̤", "áe̤", "áe̤h", "è̤", "âe̤", "ĕ̤h", "oe", "oeh"],
  Ieng: ["iĕng", "iēng", "iéng", "iék", "ièng", "iêng", "iĕk", "ieng", "iek"],
  Ia: ["iă", "iā", "iá", "iáh", "ià", "iâ", "iăh", "ia", "iah"],
  Uai: ["uăi", "uāi", "uái", "uáih", "uài", "uâi", "uăih", "uai", null],
  Eu: ["ĕu", "ēu", "áiu", "áiuh", "èu", "âiu", "ĕuh", "eu", null],
};

const TONE_DIGIT = [1, 2, 3, 4, 5, 7, 8];
// BUC initials, longest first, and their Yngping spelling.
const INITIALS: [string, string][] = [
  ["ng", "ng"], ["ch", "c"], ["l", "l"], ["b", "b"], ["g", "g"], ["k", "k"], ["d", "d"],
  ["p", "p"], ["t", "t"], ["c", "z"], ["n", "n"], ["s", "s"], ["m", "m"], ["h", "h"], ["", ""],
];
const TONE_MARKS = /[\u0306\u0304\u0301\u0300\u0302]/g;

function splitTone(x: string): [string, string] {
  const n = x.normalize("NFD");
  return [n.replace(TONE_MARKS, ""), (n.match(TONE_MARKS) ?? []).join("")];
}

// (toneless spelling + mark) -> [rime, tone index]
const FINALS = new Map<string, [string, number]>();
for (const [rime, row] of Object.entries(RIMES)) {
  for (let i = 0; i < 7; i++) {
    const v = row[i];
    if (v) {
      const [base, mark] = splitTone(v);
      FINALS.set(base + "|" + mark, [rime, i]);
    }
  }
}

function yp(ini: string, rime: string, checked: boolean, digit: number): string | null {
  const row = RIMES[rime];
  const fin = checked ? row[8] : row[7];
  return fin == null ? null : ini + fin + digit;
}

/** One BUC syllable to Yngping, or null if it is not one. */
export function bucSyllableToYngping(s: string): string | null {
  const [base, mark] = splitTone(s.trim().toLowerCase());
  if (mark.length > 1) return null;
  for (const [b, y] of INITIALS) {
    if (!base.startsWith(b)) continue;
    const hit = FINALS.get(base.slice(b.length) + "|" + mark);
    if (hit) {
      const [rime, i] = hit;
      return yp(y, rime, i === 3 || i === 6, TONE_DIGIT[i]);
    }
  }
  // A tight-rime spelling carrying a loose tone's mark ("sí" for sé), as
  // Wiktionary writes some words: the rime whose level-tone spelling this
  // is, the tone from the mark.
  const checked = /[kh]$/.test(base);
  const digit: Record<string, number> = {
    "\u0306": checked ? 8 : 1, "\u0304": 2, "\u0301": checked ? 4 : 3, "\u0300": 5, "\u0302": 7,
  };
  if (!(mark in digit)) return null;
  for (const [b, y] of INITIALS) {
    if (!base.startsWith(b)) continue;
    const rest = base.slice(b.length);
    for (const [rime, row] of Object.entries(RIMES)) {
      const form = checked ? row[6] : row[0];
      if (form && splitTone(form)[0] === rest) return yp(y, rime, checked, digit[mark]);
    }
  }
  return null;
}

/** A BUC word or phrase to Yngping, syllables separated by spaces; null
 *  unless every syllable converts. Punctuation is carried across. */
export function bucToYngping(s: string): string | null {
  if (!s || /\d/.test(s)) return null;
  const out: string[] = [];
  for (const token of s.trim().split(/\s+/)) {
    const m = token.match(/^([^\p{L}\p{M}]*)(.*?)([^\p{L}\p{M}]*)$/u);
    if (!m) return null;
    const [, lead, core, trail] = m;
    if (!core) {
      out.push(token);
      continue;
    }
    const syl = core.split("-").map(bucSyllableToYngping);
    if (syl.some((x) => x == null)) return null;
    out.push(lead + syl.join(" ") + trail);
  }
  return out.join(" ");
}

/** What to show for a word's romanization in the chosen system, and whether
 *  it was converted (false: shown as entered). */
export function showRom(rom: string | null | undefined, headword: string, sys: RomSystem): { text: string; converted: boolean } {
  const base = rom || headword;
  if (sys === "yngping") {
    const y = bucToYngping(base);
    if (y) return { text: y, converted: true };
  }
  return { text: base, converted: false };
}

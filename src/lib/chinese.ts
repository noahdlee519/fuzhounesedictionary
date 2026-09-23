import "server-only";
import * as OpenCC from "opencc-js/cn2t";

/* Simplified characters to traditional, for search and for words typed in
   simplified on the Add a word form.

   Every headword here is written in traditional characters, so a visitor who
   types simplified (most Mandarin speakers) used to find a word only when one
   of its meanings happened to carry a simplified Mandarin gloss: 饭 found 飯,
   but 鸡, 猫, 门 and 汤 missed 雞, 貓, 門 and 湯 (checked on the live site,
   22 Sep 2026).

   OpenCC's simplified→traditional table (cn2t subset, server-only, never sent
   to the browser), to the Taiwan standard forms ("tw"): the dictionary writes
   麵, 裡, 吃, 著, not OpenCC's default 麪, 裏, 喫, 着 (23 Sep 2026; until then
   面条 searched for 麪條 and missed 麵條). Character forms only: "twp" would
   also swap vocabulary (软件 → 軟體), which is not ours to change.

   A few simplified characters stand for more than one traditional one — 干
   for 乾/幹/干, 发 for 發/髮 — so search runs on what was typed as well as on
   the conversion and merges the two, and the Add a word form asks. */
let convert: ((s: string) => string) | null = null;

const HAS_CJK = /[㐀-鿿豈-﫿]/;

export function toTraditional(s: string): string {
  // Nothing to do for a query with no CJK in it (English, romanization).
  if (!HAS_CJK.test(s)) return s;
  try {
    convert ??= OpenCC.Converter({ from: "cn", to: "tw" });
    return convert(s);
  } catch {
    return s;
  }
}

/* Simplified characters with more than one traditional counterpart, and the
   counterparts. OpenCC picks one from the words around it (头发 → 頭髮, 发财 →
   發財), which is usually right; the form shows the others so a person can
   say which they meant. Only characters in common use; a character not
   listed simply takes OpenCC's pick. */
const AMBIGUOUS: Record<string, string[]> = {
  发: ["發", "髮"], 干: ["乾", "幹", "干"], 后: ["後", "后"], 里: ["裡", "里"],
  面: ["面", "麵"], 台: ["臺", "台", "檯", "颱"], 只: ["隻", "只"], 系: ["系", "係", "繫"],
  松: ["松", "鬆"], 斗: ["斗", "鬥"], 谷: ["谷", "穀"], 丑: ["丑", "醜"], 历: ["歷", "曆"],
  钟: ["鐘", "鍾"], 冲: ["沖", "衝"], 复: ["復", "複", "覆"], 制: ["制", "製"], 表: ["表", "錶"],
  汇: ["匯", "彙"], 获: ["獲", "穫"], 尽: ["盡", "儘"], 范: ["范", "範"], 采: ["采", "採"],
  卷: ["卷", "捲"], 郁: ["郁", "鬱"], 云: ["云", "雲"], 余: ["余", "餘"], 征: ["征", "徵"],
  须: ["須", "鬚"], 胡: ["胡", "鬍"], 咸: ["咸", "鹹"], 板: ["板", "闆"], 困: ["困", "睏"],
  折: ["折", "摺"], 签: ["簽", "籤"], 游: ["游", "遊"], 占: ["占", "佔"], 朴: ["朴", "樸"],
  仆: ["仆", "僕"], 蜡: ["蠟", "蜡"], 几: ["幾", "几"], 伙: ["伙", "夥"], 才: ["才", "纔"],
  家: ["家", "傢"], 姜: ["姜", "薑"], 据: ["據", "据"], 克: ["克", "剋"], 累: ["累", "纍"],
  布: ["布", "佈"], 杰: ["傑", "杰"], 周: ["周", "週"], 注: ["注", "註"], 准: ["准", "準"],
  岩: ["岩", "巖"], 恶: ["惡", "噁"], 愿: ["願", "愿"], 药: ["藥", "葯"], 叶: ["葉", "叶"],
  当: ["當", "噹"], 向: ["向", "嚮"], 回: ["回", "迴"], 志: ["志", "誌"], 致: ["致", "緻"],
  并: ["並", "併", "并"], 划: ["划", "劃"], 尸: ["屍", "尸"], 腊: ["臘", "腊"], 蒙: ["蒙", "矇", "濛"],
  饥: ["飢", "饑"], 喂: ["喂", "餵"], 霉: ["霉", "黴"], 御: ["御", "禦"], 丰: ["豐", "丰"],
  凶: ["凶", "兇"], 秋: ["秋", "鞦"], 雕: ["雕", "鵰"], 了: ["了", "瞭"],
};

export interface TraditionalReading {
  /** OpenCC's traditional form of the whole string. */
  converted: string;
  /** Characters whose traditional form is a choice: position in the string
   *  (by code point), what was typed, and the options, OpenCC's pick first. */
  choices: { at: number; typed: string; options: string[] }[];
}

export function readTraditional(s: string): TraditionalReading {
  const converted = toTraditional(s);
  const typed = Array.from(s);
  const out = Array.from(converted);
  const choices: TraditionalReading["choices"] = [];
  // Positions line up only when the conversion kept the length, which
  // OpenCC's character and phrase tables do; otherwise, no per-character
  // choice is offered and the conversion stands.
  if (typed.length === out.length) {
    typed.forEach((ch, at) => {
      const options = AMBIGUOUS[ch];
      // Only where OpenCC changed the character: in 后面 the 后 is a
      // choice (後 or 后), but the 面 it left alone is not worth asking about.
      if (options && out[at] !== ch) choices.push({ at, typed: ch, options: [out[at], ...options.filter((o) => o !== out[at])] });
    });
  }
  return { converted, choices };
}

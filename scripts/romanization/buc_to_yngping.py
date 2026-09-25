"""
Bàng-uâ-cê (Foochow Romanized) -> Yngping (榕拼), syllable by syllable.

Prototype, 25 Sep 2026. Not yet wired into the site.

The tables (BUC spellings of each rime in each of the seven tones, and the
Yngping spelling of each rime) come from the Yngdieng 榕典 project,
https://github.com/zingzeu/yngdieng (MIT licence, (c) 2020 Yngdieng Authors):
server/common/FoochowRomanizedUtils.cs and YngpingBekinUtil.cs. One change:
the 東/初 rimes are written oe/oeng/oek/oeh, as in the newer
Language-Preservation-Community/Fuzhounese-IME data, not eo/eong as in
Yngdieng's older code.

Yngping digits are tone CATEGORIES (1 上平, 2 上上, 3 上去, 4 上入, 5 下平,
7 下去, 8 下入), not the pitch numbers (44, 53, 213 ...) used elsewhere on the
site. Both systems write each syllable's citation form; neither this nor BUC
writes tone sandhi or initial assimilation.

Usage:  python3 scripts/romanization/buc_to_yngping.py "Hók-ciŭ-uâ"
        -> huk4 ziu1 ua7
"""
import unicodedata, re, csv, collections
T={
 "buc_finals": {
  "Ung": [
   "ŭng",
   "ūng",
   "óng",
   "ók",
   "ùng",
   "ông",
   "ŭk"
  ],
  "Ua": [
   "uă",
   "uā",
   "uá",
   "uáh",
   "uà",
   "uâ",
   "uăh"
  ],
  "Yong": [
   "iŏng",
   "iōng",
   "ióng",
   "iók",
   "iòng",
   "iông",
   "iŏk"
  ],
  "Iu": [
   "iŭ",
   "iū",
   "éu",
   "éuh",
   "iù",
   "êu",
   None
  ],
  "Ang": [
   "ăng",
   "āng",
   "áng",
   "ák",
   "àng",
   "âng",
   "ăk"
  ],
  "Ai": [
   "ăi",
   "āi",
   "ái",
   "áih",
   "ài",
   "âi",
   "ăih"
  ],
  "A": [
   "ă",
   "ā",
   "á",
   "áh",
   "à",
   "â",
   "ăh"
  ],
  "Ing": [
   "ĭng",
   "īng",
   "éng",
   "ék",
   "ìng",
   "êng",
   "ĭk"
  ],
  "Uang": [
   "uăng",
   "uāng",
   "uáng",
   "uák",
   "uàng",
   "uâng",
   "uăk"
  ],
  "O": [
   "ŏ̤",
   "ō̤",
   "ó̤",
   "ó̤h",
   "ò̤",
   "ô̤",
   "ŏ̤h"
  ],
  "Y": [
   "ṳ̆",
   "ṳ̄",
   "é̤ṳ",
   "é̤ṳh",
   "ṳ̀",
   "ê̤ṳ",
   "ṳ̆h"
  ],
  "Uoi": [
   "uŏi",
   "uōi",
   "uói",
   "uóih",
   "uòi",
   "uôi",
   None
  ],
  "U": [
   "ŭ",
   "ū",
   "ó",
   "óh",
   "ù",
   "ô",
   "ŭh"
  ],
  "Eing": [
   "ĕng",
   "ēng",
   "áing",
   "áik",
   "èng",
   "âing",
   "ĕk"
  ],
  "Uong": [
   "uŏng",
   "uōng",
   "uóng",
   "uók",
   "uòng",
   "uông",
   "uŏk"
  ],
  "Ui": [
   "ŭi",
   "ūi",
   "ói",
   "óih",
   "ùi",
   "ôi",
   "ŭih"
  ],
  "Ieu": [
   "iĕu",
   "iēu",
   "iéu",
   "iéuh",
   "ièu",
   "iêu",
   None
  ],
  "Yng": [
   "ṳ̆ng",
   "ṳ̄ng",
   "é̤ṳng",
   "é̤ṳk",
   "ṳ̀ng",
   "ê̤ṳng",
   "ṳ̆k"
  ],
  "Ong": [
   "ŏng",
   "ōng",
   "áung",
   "áuk",
   "òng",
   "âung",
   "ŏk"
  ],
  "I": [
   "ĭ",
   "ī",
   "é",
   "éh",
   "ì",
   "ê",
   "ĭh"
  ],
  "Oeng": [
   "ĕ̤ng",
   "ē̤ng",
   "áe̤ng",
   "áe̤k",
   "è̤ng",
   "âe̤ng",
   "ĕ̤k"
  ],
  "Au": [
   "ău",
   "āu",
   "áu",
   "áuh",
   "àu",
   "âu",
   "ăuh"
  ],
  "Uo": [
   "uŏ",
   "uō",
   "uó",
   "uóh",
   "uò",
   "uô",
   "uŏh"
  ],
  "E": [
   "ă̤",
   "ā̤",
   "á̤",
   "á̤h",
   "à̤",
   "â̤",
   "ă̤h"
  ],
  "Io": [
   "iŏ",
   "iō",
   "ió",
   "ióh",
   "iò",
   "iô",
   "iŏh"
  ],
  "Ie": [
   "iĕ",
   "iē",
   "ié",
   "iéh",
   "iè",
   "iê",
   "iĕh"
  ],
  "Iang": [
   "iăng",
   "iāng",
   "iáng",
   "iák",
   "iàng",
   "iâng",
   "iăk"
  ],
  "Oey": [
   "ŏi",
   "ōi",
   "ó̤i",
   "ó̤ih",
   "òi",
   "ô̤i",
   "ŏih"
  ],
  "Oe": [
   "ĕ̤",
   "ē̤",
   "áe̤",
   "áe̤h",
   "è̤",
   "âe̤",
   "ĕ̤h"
  ],
  "Ieng": [
   "iĕng",
   "iēng",
   "iéng",
   "iék",
   "ièng",
   "iêng",
   "iĕk"
  ],
  "Ia": [
   "iă",
   "iā",
   "iá",
   "iáh",
   "ià",
   "iâ",
   "iăh"
  ],
  "Uai": [
   "uăi",
   "uāi",
   "uái",
   "uáih",
   "uài",
   "uâi",
   "uăih"
  ],
  "Eu": [
   "ĕu",
   "ēu",
   "áiu",
   "áiuh",
   "èu",
   "âiu",
   "ĕuh"
  ]
 },
 "yp_abrupt": {
  "A": "ah",
  "Ang": "ak",
  "Ia": "iah",
  "Iang": "iak",
  "Ua": "uah",
  "Uang": "uak",
  "O": "oh",
  "Ong": "ok",
  "Io": "ioh",
  "Yong": "iok",
  "Uo": "uoh",
  "Uong": "uok",
  "Oe": "oeh",
  "Oeng": "oek",
  "E": "eh",
  "Eing": "ek",
  "Ie": "ieh",
  "Ieng": "iek",
  "I": "ih",
  "Ing": "ik",
  "U": "uh",
  "Ung": "uk",
  "Y": "yh",
  "Yng": "yk"
 },
 "yp_normal": {
  "A": "a",
  "Ia": "ia",
  "Ua": "ua",
  "Uai": "uai",
  "Ai": "ai",
  "Au": "au",
  "O": "o",
  "Io": "io",
  "Uo": "uo",
  "Uoi": "uoi",
  "Oey": "oi",
  "Oe": "oe",
  "E": "e",
  "Ie": "ie",
  "Ieu": "ieu",
  "Eu": "eu",
  "I": "i",
  "Iu": "iu",
  "U": "u",
  "Ui": "ui",
  "Y": "y",
  "Ang": "ang",
  "Iang": "iang",
  "Uang": "uang",
  "Ong": "ong",
  "Yong": "iong",
  "Uong": "uong",
  "Oeng": "oeng",
  "Eing": "eng",
  "Ieng": "ieng",
  "Ing": "ing",
  "Ung": "ung",
  "Yng": "yng"
 }
}
INITIALS=["ng","ch","l","b","g","k","d","p","t","c","n","s","m","h",""]
BUC_INIT_TO_YP={"l":"l","b":"b","g":"g","k":"k","d":"d","p":"p","t":"t","c":"z","n":"n","s":"s","":"","m":"m","ng":"ng","ch":"c","h":"h"}
TONE_NUM=[1,2,3,4,5,7,8]   # UpLevel UpUp UpFalling UpAbrupt DownLevel DownFalling DownAbrupt
N=lambda s: unicodedata.normalize("NFD", s)
TONE_MARKS="\u0306\u0304\u0301\u0300\u0302"
def split_tone(x):
    x=N(x); marks=[c for c in x if c in TONE_MARKS]
    return "".join(c for c in x if c not in TONE_MARKS), "".join(marks)
FIN={}
for f,vals in T["buc_finals"].items():
    for i,v in enumerate(vals):
        if v: FIN[split_tone(v)]=(f,i)
FALLBACK=[]
def syl(s):
    base,mark=split_tone(s.strip().lower())
    if len(mark)>1: return None
    for ini in INITIALS:
        if base.startswith(ini) and (base[len(ini):],mark) in FIN:
            f,i=FIN[(base[len(ini):],mark)]
            ab = i in (3,6)
            yp = BUC_INIT_TO_YP[ini] + (T["yp_abrupt"] if ab else T["yp_normal"])[f] + str(TONE_NUM[i])
            return yp
    # Fallback: a tight-rime spelling carrying a loose tone's mark ("sí" for
    # sé, "tíng" for táing), as Wiktionary writes some words. The rime is the
    # one whose level-tone spelling this is; the mark gives the tone.
    stop = base.endswith(("k","h"))
    MARK_TONE={"\u0306":(8 if stop else 1),"\u0304":2,"\u0301":(4 if stop else 3),"\u0300":5,"\u0302":7}
    if mark in MARK_TONE:
        for ini in INITIALS:
            rest=base[len(ini):] if base.startswith(ini) else None
            if rest is None: continue
            for f,vals in T["buc_finals"].items():
                lv=split_tone(vals[0])[0]; ab=split_tone(vals[6])[0] if vals[6] else None
                if (not stop and rest==lv) or (stop and rest==ab):
                    FALLBACK.append(s)
                    return BUC_INIT_TO_YP[ini]+(T["yp_abrupt"] if stop else T["yp_normal"])[f]+str(MARK_TONE[mark])
    return None
def word(w):
    parts=[p for p in re.split(r"[-\s]+", w.strip()) if p]
    out=[syl(p) for p in parts]
    if not parts or None in out: return None, [p for p,o in zip(parts,out) if o is None]
    return " ".join(out), []

if __name__=="__main__":
    import sys
    for arg in sys.argv[1:]:
        y, fails = word(arg)
        print(y if y else f"(not converted: {', '.join(fails)})")

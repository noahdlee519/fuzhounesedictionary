# The two faces, self-hosted

## Charis SIL — everything you read

Three files, subset from Google's copies of SIL's originals
(`google/fonts`, `ofl/charissil`, SIL Open Font License) with fontTools on
15 Sep 2026: Regular, Bold and Italic, ~76–84 KB each.

## Why this face

SIL International publishes Charis for exactly this kind of work — dictionaries
and grammars of languages that are mostly written down by the people who speak
them. That shows up in the coverage, and the coverage is the reason it is here:

- **Bàng-uâ-cê**: the combining breve and diaeresis-below (U+0306, U+0324) that
  ṳ̆, nè̤ng and ā̤ are built from, positioned by the font rather than guessed at
  by the browser.
- **IPA in full**, including ɛ ɔ ʔ ɨ and the tone letters ˥ ˩ that entries and
  the Learn page use. The face this replaced (Literata) had none of those, so
  they silently fell back to whatever serif the visitor's system offered,
  mid-word.
- **Real small capitals** (`smcp`), which the site's labels are set in.

It is also a workhorse rather than a fashion: sturdy at 13px, open enough at
display sizes, and not a face any template reaches for.

## The files

Regular 400, Bold 700, Italic 400 — there is no bold italic because nothing on
the site asks for one (italic is parts of speech and the tooltip dot). Only 400
and 700 exist, so a CSS weight of 500 renders as Regular and 600 as Bold; the
stylesheet is written with that in mind rather than relying on synthesis.

To rebuild, from `CharisSIL-{Regular,Bold,Italic}.ttf`:

    pyftsubset CharisSIL-Regular.ttf \
      --unicodes="U+0000-024F,U+0250-02FF,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+2070-209F,U+20A0-20CF,U+2100-214F,U+2190-21FF,U+2200-22FF,U+25A0-25FF,U+FB00-FB06" \
      --layout-features='*' --flavor=woff2 --no-hinting --output-file=CharisSIL-Regular.woff2

(The `Silt` table it warns about is SIL's own Graphite table, which browsers do
not use; dropping it is what we want.)


## Libre Franklin — everything you press

`LibreFranklin.woff2`, 34 KB: variable, weight 400–700, subset to Latin and
punctuation only. A Franklin Gothic revival — the gothic that sits beside a
Charter-family serif in newspapers and reference books.

It is the **interface** face and nothing else: the nav, buttons (`.btn`), chips
(`.chip`), form fields (`.field-input`), both search boxes, the language and
theme switches, the contribute tabs, the paging controls. Anything marked `.ui`
in `globals.css`.

It deliberately does **not** touch dictionary content or labels. Headings, prose,
romanization, IPA and the small-capital labels are all Charis, which is why
Franklin needs no combining marks or IPA in its subset. If you ever set something
in it that contains ṳ̆ or ɛ, it will fall back mid-word — put it in Charis instead.

    pyftsubset 'LibreFranklin[wght].ttf' \
      --unicodes="U+0000-024F,U+2000-206F,U+20A0-20CF,U+2190-21FF,U+25A0-25FF" \
      --layout-features='*' --flavor=woff2 --no-hinting --output-file=full.woff2

then `fontTools.varLib.instancer` with `{"wght": (400, 700)}`.

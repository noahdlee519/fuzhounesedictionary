import type { Panel } from "./LearnPanels";
import { ToneChart } from "./Guide";

/* The three short panels above the word list. Digests of the longer guide in
   Guide.tsx, and held to the same rule: every claim traces to a source named
   in Further reading, or to an entry in this dictionary. Nothing from memory.
   Voice: plain and short. */

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="max-w-[68ch] leading-relaxed text-inkSoft">{children}</p>
);

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">{children}</h3>
);

const Han = ({ children }: { children: React.ReactNode }) => (
  <span className="font-display font-semibold text-ink">{children}</span>
);

const Rom = ({ children }: { children: React.ReactNode }) => (
  <span className="romanization italic text-ink">{children}</span>
);

const Num = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono tabular-nums text-ink">{children}</span>
);

const Block = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-2">{children}</div>
);

/* ------------------------------------------------------------------------ */

const features = (
  <>
    <P>
      Fuzhounese is the Fuzhou variety of Eastern Min, one of the main branches of Chinese. A
      Mandarin speaker cannot understand it, and neither can a Cantonese or Hokkien speaker. Written
      down it is often readable to anyone literate in Chinese; spoken, it is a different language.
    </P>

    <Block>
      <H>Word order</H>
      <P>
        Subject, verb, object—the same order as English and Mandarin. Words do not change form:
        nouns have no plural ending and no case, verbs do not conjugate, and there is no grammatical
        gender. Position and a handful of small particles do the work that endings do in European
        languages. The owner comes first in a possessive. Tense is not marked on the verb: an adverb
        sets the time, and a particle marks that something is done.
      </P>
    </Block>

    <Block>
      <H>Questions</H>
      <P>
        The verb stays where it is. A particle at the end turns a statement into a yes-or-no
        question—<Han>汝會講福州話賣？</Han> <i>do you speak Fuzhounese?</i>—or a negative does
        the same job. <Han>未</Han> <Rom>mà̤</Rom> at the end asks whether something has happened
        yet: <Han>食飯未</Han> <Rom>siăh buáng mà̤</Rom>, <i>have you eaten?</i>, which is also how
        people say hello.
      </P>
    </Block>

    <Block>
      <H>Measure words</H>
      <P>
        You cannot put a number straight onto a noun. A measure word goes between them, and which one
        depends on the kind of thing being counted: <Han>本</Han> <Rom>buōng</Rom> for books,{" "}
        <Han>張</Han> <Rom>ciŏng</Rom> for flat things, <Han>條</Han> <Rom>diu</Rom> for long ones,{" "}
        <Han>把</Han> <Rom>bā</Rom> for things with a handle, <Han>間</Han> <Rom>gèng</Rom> for rooms
        and buildings, <Han>架</Han> <Rom>gá</Rom> for machines, <Han>隻</Han> <Rom>ciáh</Rom> for
        animals. So <Han>蜀本書</Han> <Rom>suŏh buōng cṳ̄</Rom>, <i>a book</i>.
      </P>
    </Block>

    <Block>
      <H>Tones</H>
      <P>
        Seven, when a syllable stands alone. Pitch is written on a five-point scale, <Num>5</Num>{" "}
        high and <Num>1</Num> low: <Han>陰平</Han> <Num>44</Num>, <Han>陽平</Han> <Num>53</Num>,{" "}
        <Han>上聲</Han> <Num>31</Num>, <Han>陰去</Han> <Num>213</Num>, <Han>陽去</Han>{" "}
        <Num>242</Num>, <Han>陰入</Han> <Num>23</Num>, <Han>陽入</Han> <Num>5</Num>. The last two are
        short, on syllables that end in a glottal stop—the catch in the middle of
        &ldquo;uh-oh&rdquo;. Two more tones appear only inside longer words; the dashed box is one
        of them.
      </P>
      <div className="pt-1">
        <ToneChart />
      </div>
      <p className="max-w-[68ch] text-sm text-inkFaint">
        The word under each box carries that tone. A dotted romanization means its tone mark has not
        yet been confirmed by a speaker.
      </p>
    </Block>

    <Block>
      <H>Tone sandhi</H>
      <P>
        The seven tones above are what a syllable has by itself. Put two syllables together and the
        first one changes; the last keeps its tone. This is the thing to know before anything else:
        if you read a word off this page syllable by syllable, it will not sound like the language.
        Longer words work in pairs, so a four-syllable word behaves roughly like two two-syllable
        words in a row.
      </P>
    </Block>

    <Block>
      <H>Consonants shift too</H>
      <P>
        Inside a word, a syllable&apos;s opening consonant changes to suit the ending of the syllable
        before it—a <Rom>p</Rom> goes soft after a vowel and becomes an <Rom>m</Rom> after{" "}
        <Rom>-ng</Rom>. It is why the same character can be spelt differently from one entry to the
        next. And the vowel itself can change with the tone: <Han>福</Han> on its own is [hɔuʔ], but
        in <Han>福州</Han> it is [huʔ]. Almost no other Chinese variety does this.
      </P>
    </Block>

    <Block>
      <H>Sounds</H>
      <P>
        There is no <b>f</b> and no <b>v</b>, anywhere. A syllable can end in a vowel, in{" "}
        <Rom>-ng</Rom>, or in the glottal stop—nothing else. The old <Rom>-m</Rom>, <Rom>-n</Rom>{" "}
        and <Rom>-ng</Rom> endings all became <Rom>-ng</Rom>; the old <Rom>-p</Rom>, <Rom>-t</Rom>{" "}
        and <Rom>-k</Rom> all became the glottal stop.
      </P>
    </Block>
  </>
);

/* ------------------------------------------------------------------------ */

const orthography = (
  <>
    <Block>
      <H>Characters</H>
      <P>
        Fuzhounese is written with the same Chinese characters as Mandarin, and most words share a
        character with their Mandarin relative—which is why a written sentence is usually more or
        less readable to anyone who reads Chinese, while the spoken language is not. Some ordinary
        words keep a character that sounds literary elsewhere: <Han>囝</Han> <Rom>giāng</Rom> is
        just the word for a child, <Han>儂</Han> <Rom>nè̤ng</Rom> a person, <Han>厝</Han>{" "}
        <Rom>chuó</Rom> a house. And a familiar-looking phrase can mean something else:{" "}
        <Han>莫細膩</Han> is <i>make yourself at home</i>, not &ldquo;don&apos;t be fussy&rdquo;.
      </P>
    </Block>

    <Block>
      <H>Romanization</H>
      <P>
        There is no standard, and this dictionary accepts whichever system a contributor knows. Two
        are in use here.
      </P>
      <P>
        <b>Bàng-uâ-cê</b> <Han>平話字</Han> is the older one, and most headwords use it. American
        missionaries began it in the 1850s and settled it by the 1890s. Two things trip people up:{" "}
        <Rom>b d g c</Rom> are the <i>un</i>aspirated sounds and <Rom>p t k ch</Rom> the aspirated
        ones, so <Rom>b</Rom> is not voiced like an English b; and vowel quality is marked under the
        letter (<Rom>a̤ e̤ o̤ ṳ</Rom>), leaving the space above it for the tone mark. The name of the
        city is <Rom>Hók-ciŭ</Rom>.
      </P>
      <P>
        <b>Tone numbers</b> write the pitch as digits after each syllable, <Rom>seik21 zo213</Rom>,
        using the values from the tone table. Because they record the tone as actually spoken, they
        show the sandhi that a tone mark on a headword hides. Entries taken from a printed dictionary
        use this system and say so in their notes.
      </P>
      <P>
        Where a contributor has added it, an entry also carries the pronunciation in the
        International Phonetic Alphabet.
      </P>
    </Block>
  </>
);

/* ------------------------------------------------------------------------ */

const READING: { href: string; title: string; note: string }[] = [
  { href: "https://www.fulingo.com/", title: "Fulingo", note: "Duolingo-style Fuzhounese lessons with native audio" },
  { href: "https://seedict.com/", title: "Seedict", note: "Fuzhounese word list" },
  { href: "https://en.wiktionary.org/wiki/Fuzhounese", title: "Wiktionary: Fuzhounese", note: "Dictionary entry for Fuzhounese" },
  { href: "https://en.wikipedia.org/wiki/Fuzhou_dialect", title: "Wikipedia: Fuzhou dialect", note: "Sounds, tones, sandhi and grammar" },
  { href: "https://en.wikipedia.org/wiki/B%C3%A0ng-u%C3%A2-c%C3%AA", title: "Wikipedia: Bàng-uâ-cê", note: "The background and rules for a popular romanization method" },
  { href: "https://cdo.wikipedia.org/", title: "Mìng-dĕ̤ng-ngṳ̄ Wikipedia", note: "A Wiki written in Bàng-uâ-cê" },
];

const reading = (
  <>
    <P>Other places to learn, look things up, or read the language.</P>
    <ul className="max-w-[68ch] space-y-3">
      {READING.map((r) => (
        <li key={r.href} className="leading-relaxed">
          <a
            href={r.href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-lacquer hover:underline"
          >
            {r.title}
          </a>{" "}
          <span className="text-inkFaint">— {r.note}</span>
        </li>
      ))}
    </ul>
  </>
);

export const learnPanels: Panel[] = [
  { key: "features", label: "Features", body: features },
  { key: "orthography", label: "Orthography", body: orthography },
  { key: "reading", label: "Further reading", body: reading },
];

import type { Panel } from "./LearnPanels";
import { ToneChart, Table } from "./Guide";

/* The three short panels above the word list. Digests of the longer guide in
   Guide.tsx, and held to the same rule: every claim traces to a source named
   in Further reading, or to an entry in this dictionary. Nothing from memory.
   Voice: plain and short. */

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="leading-relaxed text-inkSoft">{children}</p>
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

const Block = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <div id={id} className="scroll-mt-24 space-y-2">{children}</div>
);

/* Anchors that live inside a panel, so a link like "#tones" can open the
   right panel first. LearnPanels reads this. */
export const panelAnchors: Record<string, string> = { tones: "features" };

/* ------------------------------------------------------------------------ */

const features = (
  <>
    <P>
      Fuzhounese is the variety of Eastern Min Chinese spoken around the city of Fuzhou. Written
      down, it is often legible for those literate in other Chinese dialects like Mandarin and
      Cantonese. However, the spoken form is altogether different.
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

    <Block id="tones">
      <H>Tones</H>
      <P>
        Seven, when a syllable stands alone. Pitch is written on a five-point scale, <Num>5</Num>{" "}
        high and <Num>1</Num> low: <Han>陰平</Han> <Num>44</Num>, <Han>陽平</Han> <Num>53</Num>,{" "}
        <Han>上聲</Han> <Num>31</Num>, <Han>陰去</Han> <Num>213</Num>, <Han>陽去</Han>{" "}
        <Num>242</Num>, <Han>陰入</Han> <Num>23</Num>, <Han>陽入</Han> <Num>5</Num>. The last two are
        short, on syllables that end in a glottal stop—the catch in the middle of
        &ldquo;uh-oh&rdquo;. Two more tones appear only inside longer words; the last box is one of
        them, heard on the first syllable of <Han>二八天</Han>.
      </P>
      <div className="pt-1">
        <ToneChart />
      </div>
      <p className="text-sm text-inkFaint">
        The word under each box carries that tone. The two short lines are the entering tones, cut
        off by the glottal stop. A dotted romanization means its tone mark has not yet been
        confirmed by a speaker.
      </p>
    </Block>

    <Block>
      <H>Tone sandhi</H>
      <P>
        The tone in the table is the tone a syllable has <i>on its own</i>. Inside a word it is
        different. The rule has two halves. <b>The last syllable of a word keeps its own tone.</b>{" "}
        <b>The syllable before it changes</b>, and what it changes to depends on both syllables.
      </P>
      <P>
        Take the name of the city, <Han>福州</Han> <Rom>Hók-ciŭ</Rom>. <Han>福</Han> by itself is a
        short rising tone, <Num>23</Num>. <Han>州</Han> by itself is high and level, <Num>44</Num>.
        Said together, <Han>州</Han> stays at <Num>44</Num> because it is last, but <Han>福</Han>{" "}
        drops to a low <Num>21</Num>, a pitch it never has when alone. So the word is{" "}
        <Rom>huk21 ciu44</Rom>, not <Rom>hok23 ciu44</Rom>.
      </P>
      <P>
        This is why a word read off the page syllable by syllable does not sound like the language,
        and why the tone marks on a Bàng-uâ-cê headword cannot simply be read aloud: they give each
        syllable&apos;s tone in isolation. Entries written with tone numbers, like{" "}
        <Rom>seik21 zo213</Rom>, are different: they record the tones as actually spoken, with the
        change already made. Longer words work in pairs, so a four-syllable word behaves roughly
        like two two-syllable words in a row. The practical advice is to learn each word whole, from
        a recording, rather than assembling it from its parts.
      </P>
    </Block>

    <Block>
      <H>Consonants shift too</H>
      <P>
        Tones are not the only thing that moves. Inside a word, the consonant that <i>opens</i> a
        syllable changes to suit how the syllable <i>before</i> it ends. There are three cases.
      </P>
      <Table
        head={["Opening consonant", "After a vowel", "After -ng", "After -k"]}
        rows={[
          [<>b, p</>, "softens to a loose b, [β]", "becomes m", "no change"],
          [<>d, t, s</>, "become l", "become n", "no change"],
          [<>g, k, h</>, "disappear", "become ng", "no change"],
          [<>c, ch</>, "soften to [ʒ], the s of “measure”", "—", "no change"],
          [<>m, n, ng</>, "no change", "no change", "no change"],
        ]}
      />
      <P>
        One word shows all three. <Han>八</Han> <Rom>báik</Rom>, <i>eight</i>, opens with a b. In{" "}
        <Han>二八天</Han> <Rom>ni21 weik21 tieng44</Rom> it follows a vowel, so the b goes soft. In{" "}
        <Han>七讲八昕</Han> <Rom>cik21 goung21 meik5 tiang213</Rom> it follows an <Rom>-ng</Rom>, so
        the same b becomes an m. Same character, three different consonants, depending only on its
        neighbour. This is why one character can be spelt differently from one entry to the next,
        and why a word you know may be hard to pick out inside a longer one.
      </P>
      <P>
        The vowel can move as well. Every vowel has a tighter and a looser form, and the tone decides
        which one you get; when the tone changes inside a word, the vowel follows it. <Han>福</Han>{" "}
        alone is [hɔuʔ], with the loose vowel; in <Han>福州</Han>, on its changed tone, it tightens
        to [huʔ]. Almost no other Chinese variety does this.
      </P>
    </Block>

    <Block>
      <H>Sounds</H>
      <P>
        Fourteen consonants and seven vowels; the Orthography tab has the full chart with how each is
        said. Three things stand out if you come from English or Mandarin.
      </P>
      <P>
        <b>No f, no v.</b> Nowhere in the language. Where Mandarin has an f, Fuzhounese usually has
        an h: <Han>福</Han> is <Rom>hók</Rom>, <Han>花</Han> is <Rom>huă</Rom>, <Han>風</Han> is{" "}
        <Rom>hŭng</Rom>.
      </P>
      <P>
        <b>Only three ways to end a syllable.</b> A vowel, <Rom>-ng</Rom>, or the glottal stop, the
        catch in the middle of &ldquo;uh-oh&rdquo;, written <Rom>-h</Rom> or <Rom>-k</Rom>. Where
        older Chinese ended syllables in <Rom>-m</Rom>, <Rom>-n</Rom> or <Rom>-ng</Rom>, Fuzhounese
        has only <Rom>-ng</Rom>: <Han>心</Han> <Rom>sĭng</Rom>, <Han>山</Han> <Rom>săng</Rom>,{" "}
        <Han>新</Han> <Rom>sĭng</Rom>. Where it ended in <Rom>-p</Rom>, <Rom>-t</Rom> or{" "}
        <Rom>-k</Rom>, there is only the catch: <Han>十</Han> <Rom>sĕk</Rom>, <Han>白</Han>{" "}
        <Rom>băh</Rom>, <Han>八</Han> <Rom>báik</Rom>.
      </P>
      <P>
        <b>Two vowels English does not have.</b> <Rom>ṳ</Rom> is <i>ee</i> said with the lips
        rounded, as in French <i>tu</i>: <Han>雨</Han> <Rom>ṳ̄</Rom>, <Han>魚</Han> <Rom>ngṳ̀</Rom>.{" "}
        <Rom>e̤</Rom> is <i>eh</i> with the lips rounded, as in French <i>peu</i>: <Han>讀</Han>{" "}
        <Rom>tĕ̤k</Rom>. The mark underneath is the signal.
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
        ones. So <Rom>b</Rom> is not voiced like an English b: it is the p of &ldquo;spin&rdquo;,
        without the puff of air that the p of &ldquo;pin&rdquo; has. In the same way <Rom>d</Rom> is
        the t of &ldquo;stop&rdquo;, <Rom>g</Rom> the k of &ldquo;skin&rdquo;, and <Rom>c</Rom> the
        ts of &ldquo;cats&rdquo;. And vowel quality is marked under the letter (<Rom>a̤ e̤ o̤ ṳ</Rom>),
        leaving the space above it for the tone mark. For example, in <Han>乇</Han> <Rom>nó̤h</Rom>,{" "}
        <i>thing</i>, the mark under the o says which o it is, and the mark above it gives the tone.
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

    <Block>
      <H>The Bàng-uâ-cê alphabet</H>
      <P>
        Every letter, with its sound in the International Phonetic Alphabet, the nearest English
        sound, and a word from this dictionary that uses it. The tone marks above the vowels are a
        separate matter, covered under{" "}
        <a href="#tones" className="text-lacquer hover:underline">
          Tones
        </a>{" "}
        in the Features panel.
      </P>
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">Consonants</p>
      <Table
        head={["Letter", "IPA", "Sounds like", "Example"]}
        rows={[
          [<Rom>b</Rom>, "p", "p in spin (no puff of air)", <><Han>八</Han> <Rom>báik</Rom>, eight</>],
          [<Rom>p</Rom>, "pʰ", "p in pin (with the puff)", <><Han>鼻</Han> <Rom>pĭ</Rom>, nose</>],
          [<Rom>m</Rom>, "m", "m in man", <><Han>米</Han> <Rom>mī</Rom>, rice</>],
          [<Rom>d</Rom>, "t", "t in stop (no puff of air)", <><Han>地</Han> <Rom>dê</Rom>, ground</>],
          [<Rom>t</Rom>, "tʰ", "t in top (with the puff)", <><Han>天</Han> <Rom>tiĕng</Rom>, sky</>],
          [<Rom>n</Rom>, "n", "n in no", <><Han>年</Han> <Rom>niòng</Rom>, year</>],
          [<Rom>l</Rom>, "l", "l in low", <><Han>冷</Han> <Rom>lēng</Rom>, cold</>],
          [<Rom>g</Rom>, "k", "k in skin (no puff of air)", <><Han>狗</Han> <Rom>gāu</Rom>, dog</>],
          [<Rom>k</Rom>, "kʰ", "k in kin (with the puff)", <><Han>看</Han> <Rom>káng</Rom>, to look</>],
          [<Rom>ng</Rom>, "ŋ", "ng in sing, but starting a syllable", <><Han>魚</Han> <Rom>ngṳ̀</Rom>, fish</>],
          [<Rom>h</Rom>, "h", "h in hat", <><Han>海</Han> <Rom>hāi</Rom>, sea</>],
          [<Rom>c</Rom>, "ts", "ts in cats (no puff of air)", <><Han>酒</Han> <Rom>ciū</Rom>, wine</>],
          [<Rom>ch</Rom>, "tsʰ", "ts in cats, with a puff of air", <><Han>菜</Han> <Rom>chái</Rom>, vegetable</>],
          [<Rom>s</Rom>, "s", "s in see", <><Han>山</Han> <Rom>săng</Rom>, mountain</>],
        ]}
      />
      <p className="pt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">Vowels</p>
      <Table
        head={["Letter", "IPA", "Sounds like", "Example"]}
        rows={[
          [<Rom>a</Rom>, "a", "a in father", <><Han>花</Han> <Rom>huă</Rom>, flower</>],
          [<Rom>a̤</Rom>, "ɛ", "e in bed", <><Han>洗</Han> <Rom>sā̤</Rom>, to wash</>],
          [<Rom>e̤</Rom>, "ø", "eh with the lips rounded, as in French peu", <><Han>讀</Han> <Rom>tĕ̤k</Rom>, to read</>],
          [<Rom>i</Rom>, "i", "ee in see", <><Han>鼻</Han> <Rom>pĭ</Rom>, nose</>],
          [<Rom>o̤</Rom>, "ɔ", "aw in law", <><Han>做</Han> <Rom>có̤</Rom>, to do</>],
          [<Rom>u</Rom>, "u", "oo in food", <><Han>烏</Han> <Rom>ŭ</Rom>, black</>],
          [<Rom>ṳ</Rom>, "y", "ee with the lips rounded, as in French tu", <><Han>雨</Han> <Rom>ṳ̄</Rom>, rain</>],
        ]}
      />
      <P>
        The vowels combine: <Rom>ia</Rom>, <Rom>ua</Rom>, <Rom>ie</Rom>, <Rom>uo</Rom>, <Rom>io</Rom>,{" "}
        <Rom>ai</Rom>, <Rom>au</Rom>, <Rom>iu</Rom>, <Rom>ui</Rom>, <Rom>eu</Rom> and so on, each said
        as its letters in sequence: <Han>天</Han> <Rom>tiĕng</Rom>, <Han>花</Han> <Rom>huă</Rom>,{" "}
        <Han>狗</Han> <Rom>gāu</Rom>, <Han>手</Han> <Rom>chiū</Rom>.
      </P>
      <p className="pt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">Endings</p>
      <Table
        head={["Letter", "IPA", "Sounds like", "Example"]}
        rows={[
          [<Rom>-ng</Rom>, "ŋ", "ng in sing", <><Han>心</Han> <Rom>sĭng</Rom>, heart</>],
          [<Rom>-h</Rom>, "ʔ", "the catch in “uh-oh”; the syllable stops short", <><Han>白</Han> <Rom>băh</Rom>, white</>],
          [<Rom>-k</Rom>, "ʔ", "the same catch; spelt k because it once was one", <><Han>十</Han> <Rom>sĕk</Rom>, ten</>],
        ]}
      />
      <p className="text-sm text-inkFaint">
        Sounds after the Bàng-uâ-cê tables on Wikipedia, listed under Further reading. Some speakers
        say <Rom>a̤</Rom> closer to <i>e</i> in <i>bed</i>, and <Rom>o̤</Rom> closer to <i>o</i>; the
        values given are the traditional ones the spelling was built on.
      </p>
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
    <ul className="space-y-3">
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

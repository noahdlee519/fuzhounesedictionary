import Link from "next/link";

/* ---------------------------------------------------------------------------
   The teaching half of /learn. Static prose and tables, no client JS.

   SOURCING RULE FOR THIS FILE: every linguistic claim here is either sourced
   from the references listed in <Sources/> at the foot of the page, or is a
   fact about the site's own data. Nothing is written from memory. Anything not
   yet confirmed is wrapped in <Unverified/> so a reader can see its status —
   do not quietly promote such an item to plain text.
   --------------------------------------------------------------------------- */

export const SECTIONS = [
  { id: "what", label: "What Fuzhounese is" },
  { id: "sounds", label: "Sounds" },
  { id: "tones", label: "Tones" },
  { id: "sandhi", label: "Tone sandhi" },
  { id: "assimilation", label: "Initial assimilation" },
  { id: "rimes", label: "Tight and loose rimes" },
  { id: "writing", label: "Writing it down" },
  { id: "grammar", label: "Grammar" },
  { id: "mandarin", label: "Against Mandarin" },
  { id: "phrases", label: "Phrasebook" },
  { id: "words", label: "All words" },
];

const H2 = ({ id, kicker, children }: { id: string; kicker?: string; children: React.ReactNode }) => (
  <div className="border-t border-rule pt-6">
    {kicker && (
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">{kicker}</p>
    )}
    <h2
      id={id}
      className="mt-2 scroll-mt-24 font-display text-xl font-bold uppercase tracking-tight sm:text-2xl"
    >
      {children}
    </h2>
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="max-w-[68ch] text-[17px] leading-relaxed text-inkSoft">{children}</p>
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

/* Chao tone letters are missing from many system fonts and render as faint
   ticks, so they sit beside a numeric value rather than carrying the table. */
const Tone = ({ children }: { children: React.ReactNode }) => (
  <span className="text-inkFaint" aria-hidden>
    {children}
  </span>
);

/** A claim that has not been checked by a speaker. Visible on purpose. */
const Unverified = () => (
  <span
    title="Not yet checked by a native speaker"
    className="ml-2 whitespace-nowrap border border-rule px-1.5 py-0.5 align-middle font-mono text-[10px] uppercase tracking-wide text-inkFaint"
  >
    unchecked
  </span>
);

const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[34rem] border-collapse text-left text-[15px]">
      <thead>
        <tr>
          {head.map((h) => (
            <th
              key={h}
              className="border-b border-ruleStrong pb-2 pr-4 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-inkFaint"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className="border-b border-rule py-2 pr-4 align-top text-inkSoft">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);


/* Bi-syllabic tone sandhi. Rows are the first (non-final) syllable, columns the
   syllable that follows. Each cell is what the FIRST syllable becomes; the final
   syllable keeps its own tone. Transcribed from the printed source that this
   dictionary's tone numbering follows — see <Sources/>. */
const TONE_ORDER = ["44", "53", "31", "213", "242", "23", "5"];
const SANDHI: Record<string, string[]> = {
  //          +44        +53        +31     +213       +242       +23        +5
  "44":  ["44",      "44",      "31",   "53",      "53",      "53",      "44"],
  "53":  ["44",      "44",      "31",   "53",      "53",      "53",      "44"],
  "31":  ["21",      "44",      "31",   "44",      "21",      "21",      "44"],
  "213": ["21",      "21",      "24",   "21",      "21",      "21",      "21"],
  "242": ["44",      "44",      "53",   "53",      "53",      "53",      "44"],
  "23":  ["21",      "44",      "24",   "44 / 5",  "44 / 5",  "44 / 5",  "44 / 5"],
  "5":   ["44 / 5",  "44 / 5",  "31",   "44 / 5",  "44 / 5",  "44 / 5",  "44 / 5"],
};

const SandhiGrid = () => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[36rem] border-collapse text-center text-[15px]">
      <caption className="pb-3 text-left font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">
        First syllable becomes &darr; &nbsp;·&nbsp; followed by &rarr;
      </caption>
      <thead>
        <tr>
          <th className="border-b border-ruleStrong pb-2 pr-3 text-left font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">
            1st
          </th>
          {TONE_ORDER.map((t) => (
            <th
              key={t}
              className="border-b border-ruleStrong pb-2 font-mono text-[11px] font-medium tabular-nums text-inkFaint"
            >
              {t}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {TONE_ORDER.map((row) => (
          <tr key={row}>
            <th className="border-b border-rule py-2 pr-3 text-left font-mono text-[13px] font-medium tabular-nums text-ink">
              {row}
            </th>
            {SANDHI[row].map((cell, i) => (
              <td
                key={i}
                className={
                  "border-b border-rule py-2 font-mono text-[13px] tabular-nums " +
                  (cell === row ? "text-inkFaint" : "text-ink")
                }
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-2 text-xs text-inkFaint">
      Greyed cells are combinations where the first syllable does not change.
    </p>
  </div>
);

export function Contents() {
  return (
    <nav
      aria-label="On this page"
      className="sticky top-0 z-20 -mx-5 mb-2 border-b border-rule bg-paper/95 px-5 py-3 backdrop-blur"
    >
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-inkSoft hover:text-lacquer">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Guide() {
  return (
    <div className="space-y-10">
      {/* ------------------------------------------------------------ what */}
      <section className="space-y-4">
        <H2 id="what" kicker="福州話">
          What Fuzhounese is
        </H2>
        <P>
          Fuzhounese is the Fuzhou variety of <b>Eastern Min</b>, one of the primary branches of
          Chinese. Within Eastern Min it belongs to the Houguan group, spoken across eleven cities
          and counties of eastern Fujian and in the Matsu Islands. It is not mutually intelligible
          with Mandarin, nor with Hokkien or Cantonese, so by the ordinary linguistic test it is a
          language rather than a dialect, whatever the conventional English name suggests.
        </P>
        <P>
          Most of its everyday vocabulary is old. A large part of it goes back more than twelve
          hundred years, and words that are archaic or literary in Mandarin are still ordinary here:{" "}
          <Han>囝</Han> for a child or son is the standard word, not a poeticism.
        </P>
      </section>

      {/* ---------------------------------------------------------- sounds */}
      <section className="space-y-4">
        <H2 id="sounds" kicker="聲韻">
          Sounds
        </H2>
        <P>
          Fifteen initial consonants, including a zero initial realised as a glottal stop. Seven
          vowel phonemes — /a e ø o i u y/ — which combine with the two possible codas into
          forty-six rimes.
        </P>
        <P>
          Two features catch a Mandarin speaker out immediately. First, there is <b>no f or v</b>{" "}
          anywhere in the language; that absence is shared by every branch of Min. Second, the
          endings have collapsed: the old <Rom>-m</Rom>, <Rom>-n</Rom> and <Rom>-ng</Rom> have all
          merged into a single <Rom>-ng</Rom>, and the old <Rom>-p</Rom>, <Rom>-t</Rom> and{" "}
          <Rom>-k</Rom> have all merged into a glottal stop. So a syllable can end in a vowel, in{" "}
          <Rom>-ng</Rom>, or in a catch in the throat, and nothing else.
        </P>
        <P>
          The two entering-tone codas are worth a note. Historical <Rom>-k</Rom> and historical{" "}
          <Rom>-ʔ</Rom> sound identical to most speakers today, but they still behave differently
          when a syllable follows them — see initial assimilation below. The distinction survives in
          the grammar of the sound system after it has disappeared from the sound itself.
        </P>
      </section>

      {/* ----------------------------------------------------------- tones */}
      <section className="space-y-4">
        <H2 id="tones" kicker="聲調">
          Tones
        </H2>
        <P>
          Seven tones, plus two more that occur only inside longer words. Pitch is written on the
          conventional five-point scale, <Num>5</Num> highest and <Num>1</Num> lowest, so{" "}
          <Num>44</Num> is a high level tone and <Num>53</Num> falls from high to mid.
        </P>
        <Table
          head={["", "Name", "Pitch", "Shape", "Example"]}
          rows={[
            ["1", <>陰平 yīnpíng</>, <Num>44</Num>, "high level", <><Han>伊</Han> <Rom>i44</Rom>{" "}he, she</>],
            ["2", <>陽平 yángpíng</>, <Num>53</Num>, "high falling", <><Han>姨</Han> <Rom>i53</Rom>{" "}aunt</>],
            ["3", <>上聲 shǎngshēng</>, <Num>31</Num>, "mid, near level", <><Han>以</Han> <Rom>i31</Rom>{" "}with which</>],
            ["4", <>陰去 yīnqù</>, <Num>213</Num>, "low falling", <><Han>亿</Han> <Rom>ei213</Rom>{" "}hundred million</>],
            ["5", <>陽去 yángqù</>, <Num>242</Num>, "rising then falling", <><Han>味</Han> <Rom>ei242</Rom>{" "}smell</>],
            ["6", <>陰入 yīnrù</>, <Num>23</Num>, "short, abrupt rise", <><Han>一</Han> <Rom>eik23</Rom>{" "}one</>],
            ["7", <>陽入 yángrù</>, <Num>5</Num>, "high and short", <><Han>译</Han> <Rom>ik5</Rom>{" "}to translate</>],
          ]}
        />
        <P>
          Three of these are worth a warning, because what is written is not quite what you hear.
          Tone 3 is written <Num>31</Num> as though it fell, but in practice it sits closer to a mid
          level <Num>33</Num> — two tone-3 syllables in a row come out flat, with no fall audible at
          all. Tone 4 is written <Num>213</Num> after the Mandarin third tone, but the rising tail is
          rarely produced; it usually lands as a low fall, <Num>21</Num> or <Num>31</Num>. And tone 1
          is <Num>44</Num> before a <Num>53</Num> or a <Num>5</Num>, but a run of consecutive{" "}
          <Num>44</Num> syllables rises to a full <Num>55</Num>.
        </P>
        <P>
          Tones 6 and 7 are the checked tones, on syllables that end in a glottal stop. Both are
          short, which is why tone 7 is written with a single digit.
        </P>
        <P>
          The two extra tones are <Num>21</Num> and <Num>24</Num>. They never appear on a word said
          alone — only on a non-final syllable whose original tone has been altered by the sandhi
          below.
        </P>
      </section>

      {/* ---------------------------------------------------------- sandhi */}
      <section className="space-y-4">
        <H2 id="sandhi" kicker="連讀變調">
          Tone sandhi
        </H2>
        <P>
          The seven tones above are <i>isolation</i> tones: the tone a syllable carries when it
          stands alone. Put two syllables together into a word and the non-final one changes. This is
          the part that makes Fuzhounese hard, and the part a word list cannot teach you.
        </P>
        <P>
          <b>The final syllable keeps its own tone. The syllable before it does not.</b> Read the
          grid by finding your first syllable down the left and the following syllable across the
          top; the cell gives you what the first syllable actually becomes.
        </P>
        <SandhiGrid />
        <P>
          A few things fall out of the grid. Tones 1 and 2 behave identically in first position —
          the whole top two rows are the same. Tone 3 followed by tone 3 stays put, one of the only
          combinations that does not move. And a following tone 3 pulls almost everything before it
          down to <Num>31</Num>.
        </P>
        <P>
          Where the grid gives two values, both are heard. The alternatives belong to the checked
          tones: a syllable in tone 6 or 7 sometimes keeps a firm glottal ending, in which case it
          stays a checked syllable whatever its sandhi pitch, and sometimes lets that ending soften,
          in which case it behaves like an unchecked one. Entries in this dictionary use whichever
          matches the word as actually spoken.
        </P>
        <P>
          Longer words are built from this. A four-syllable compound behaves roughly as two
          two-syllable units in sequence, so the same table applies twice.
        </P>
        <div className="border-l-2 border-lacquer bg-surface p-4">
          <p className="max-w-[62ch] text-sm text-inkSoft">
            Three printed rules alter the <i>final</i> syllable as well, against the general
            pattern: <Num>44</Num>+<Num>5</Num> is given as &ldquo;44 5 or 44 44&rdquo;,{" "}
            <Num>23</Num>+<Num>23</Num> as &ldquo;44 242 or 5 242&rdquo;, and one rule is printed
            with a first tone of <Num>214</Num>, which is not one of the seven. The first may be
            real; the other two look like typesetting slips. They are recorded here as printed rather
            than silently corrected.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------- assimilation */}
      <section className="space-y-4">
        <H2 id="assimilation" kicker="聲母類化">
          Initial assimilation
        </H2>
        <P>
          Alongside the tone changes, the <i>consonants</i> shift too. When one syllable follows
          another inside a word, its initial consonant assimilates to the ending of the syllable
          before it. This is a hallmark of Eastern Min and it is why the same character can look
          quite different from one entry to the next.
        </P>
        <Table
          head={["Initial", "After a vowel or -ʔ", "After -ng", "After -k"]}
          rows={[
            [<>p, pʰ</>, "β", "m", "unchanged"],
            [<>t, tʰ, s</>, "l", "n", "unchanged"],
            [<>k, kʰ, h</>, "dropped", "ŋ", "unchanged"],
            [<>ts, tsʰ</>, "ʒ", "—", "unchanged"],
            [<>m, n, ŋ</>, "unchanged", "unchanged", "unchanged"],
            [<>l</>, "—", "n", "unchanged"],
          ]}
        />
        <P>
          You can watch this happening in this dictionary. <Han>八</Han> on its own is{" "}
          <Rom>baik</Rom>. In <Han>二八天</Han> <Rom>ni21 weik21 tieng44</Rom> it follows a vowel, so
          the p softens to a w. In <Han>七讲八昕</Han> <Rom>cik21 goung21 meik5 tiang213</Rom> it
          follows an <Rom>-ng</Rom>, so the same p becomes m. Same character, same word, three
          different consonants depending on the company it keeps.
        </P>
        <P>
          Note the last column. Historical <Rom>-k</Rom> triggers nothing at all, while historical{" "}
          <Rom>-ʔ</Rom> triggers the whole first column — even though the two are pronounced alike.
          Assimilation is also somewhat variable between speakers and between set phrases, so
          expect the dictionary to disagree with itself occasionally.
        </P>
      </section>

      {/* ----------------------------------------------------------- rimes */}
      <section className="space-y-4">
        <H2 id="rimes" kicker="鬆緊韻">
          Tight and loose rimes
        </H2>
        <P>
          A third alternation, and one that is close to unique to Fuzhou among Chinese varieties: the
          vowel itself changes with the tone. Each rime has a tight form and a loose form. Dark
          level, rising, light level and light entering take the tight form; dark departing, dark
          entering and light departing take the loose one.
        </P>
        <P>
          In sandhi, a loose rime shifts to its tight counterpart. The name of the city shows it:{" "}
          <Han>福</Han> alone is [hɔuʔ˨˦], but in <Han>福州</Han> it becomes [huʔ˨˩] — the tone
          changes and the vowel changes with it. Unlike the tone sandhi this is not obligatory, and
          whether a speaker applies it can carry a difference of meaning or of grammatical function.
        </P>
      </section>

      {/* --------------------------------------------------------- writing */}
      <section className="space-y-4">
        <H2 id="writing" kicker="平話字">
          Writing it down
        </H2>
        <P>
          There is no single standard romanization, which is why this dictionary accepts whatever
          system a contributor already uses.
        </P>
        <P>
          <b>Bàng-uâ-cê</b> is the historic one. American Methodist missionary M. C. White made the
          first attempt in the 1850s, adapting an existing orthography; Robert S. Maclay, R. W.
          Stewart and Charles Hartwell refined it into a standard form by the 1890s. It uses{" "}
          <Rom>b d g c</Rom> for the unaspirated stops and affricate and <Rom>p t k ch</Rom> for
          their aspirated counterparts — so <Rom>b</Rom> is not a voiced sound — and it marks vowel
          quality with a diacritic underneath the letter (<Rom>a̤ e̤ o̤ ṳ</Rom>), leaving the space
          above free for the tone mark. It never spread far beyond the mission churches and their
          schools, and today it is largely historical.
        </P>
        <P>
          Most entries here use a <b>numeric transcription</b> instead, writing the tone as digits
          after each syllable: <Rom>seik21 zo213</Rom>. The digits are the pitch values in the tone
          table above. Because they record the tone as actually spoken, they show the sandhi that a
          tone mark on a dictionary headword hides — <Rom>seik21</Rom> is tone 7 shifted by the
          syllable that follows it, not a tone in its own right.
        </P>
        <div className="border-l-2 border-lacquer bg-surface p-4">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">To be added</p>
          <p className="mt-2 max-w-[62ch] text-sm text-inkSoft">
            The tone-mark table for Bàng-uâ-cê — which diacritic goes with which of the seven tones.
            It will be taken from a printed source rather than reconstructed.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------- grammar */}
      <section className="space-y-4">
        <H2 id="grammar" kicker="語法">
          Grammar
        </H2>
        <P>
          Structurally Fuzhounese is a Sinitic language and will feel familiar to anyone who knows
          one. It is <b>analytic</b>: words do not inflect. Nouns have no case and no plural ending,
          verbs do not conjugate for person or number, and there is no grammatical gender. Word
          order and a set of small particles carry the work that endings do in European languages.
        </P>
        <Table
          head={["Feature", "Fuzhounese", "Compare"]}
          rows={[
            [
              "Word order",
              "Subject–verb–object",
              "as English; unlike Japanese or Korean",
            ],
            [
              "Alignment",
              "No morphological case at all — nominative/accusative is carried by position, not form",
              "unlike Latin or Russian",
            ],
            [
              "Tense",
              "None marked on the verb. Time is set by adverbs, and completion or duration by aspect particles",
              "unlike English -ed",
            ],
            [
              "Classifiers",
              "A measure word stands between a number and its noun",
              "as Mandarin 個; unlike English",
            ],
            [
              "Possession",
              "Possessor precedes possessed, joined by a particle",
              "as Mandarin 的",
            ],
            [
              "Questions",
              "Formed with a final particle or a negative, not by moving the verb",
              "unlike English inversion",
            ],
          ]}
        />
        <P>
          The particles that do this work — the possessive marker, the aspect markers, the
          question particles — differ from their Mandarin equivalents in both shape and use, and
          the reference works available to us do not treat them systematically.
          <Unverified /> They will be filled in here from a printed grammar or from speakers, entry
          by entry, rather than guessed at from Mandarin.
        </P>
      </section>

      {/* -------------------------------------------------------- mandarin */}
      <section className="space-y-4">
        <H2 id="mandarin" kicker="對比">
          Against Mandarin
        </H2>
        <P>
          Written down, a Fuzhounese sentence is often broadly readable to anyone literate in
          Chinese, because most words have cognates elsewhere. Spoken, it is not intelligible at
          all. The gap between those two facts is the single most useful thing to know about the
          language.
        </P>
        <Table
          head={["", "Fuzhounese", "Mandarin"]}
          rows={[
            ["Tones", "7", "4"],
            ["f / v sounds", "none", "f present"],
            ["Syllable endings", "vowel, -ng, or glottal stop", "vowel, -n, -ng"],
            ["Tone sandhi", "pervasive, and reshapes every non-final syllable", "limited"],
            ["Consonant mutation", "yes — initials assimilate inside a word", "no"],
            ["Vowel–tone interaction", "yes — tight and loose rimes", "no"],
          ]}
        />
        <P>
          Beware false friends. <Han>莫細膩</Han> means <i>make yourself at home</i>, not
          &ldquo;don&apos;t be fussy&rdquo; as the characters would suggest to a Mandarin reader.
          Reading the characters through Mandarin is a reliable way to misunderstand the sentence.
        </P>
      </section>

      {/* --------------------------------------------------------- phrases */}
      <section className="space-y-4">
        <H2 id="phrases" kicker="常用語">
          Phrasebook
        </H2>
        <div className="border-l-2 border-lacquer bg-surface p-4">
          <p className="max-w-[62ch] text-sm text-inkSoft">
            A starting set. Only phrases traceable to a published source are listed, and every one
            is marked unchecked until a speaker has confirmed it aloud — a phrasebook with the wrong
            tone teaches the wrong word. If you speak Fuzhounese and can correct or add to this,{" "}
            <Link href="/request" className="text-lacquer hover:underline">
              please do
            </Link>
            .
          </p>
        </div>
        <Table
          head={["English", "Characters", "Romanization", ""]}
          rows={[
            ["No / it is not", <Han>伓是</Han>, <Rom>ng-sê</Rom>, <Unverified />],
            ["That&rsquo;s right / not wrong", <Han>無綻</Han>, <Rom>mò̤ dâng</Rom>, <Unverified />],
            [
              "Do you speak Fuzhounese?",
              <Han>汝會講福州話賣？</Han>,
              <Rom>—</Rom>,
              <Unverified />,
            ],
            ["Make yourself at home", <Han>莫細膩</Han>, <Rom>—</Rom>, <Unverified />],
          ]}
        />
        <P>
          This is the thinnest section on the page, and deliberately so. Greetings, numbers, food
          and directions all belong here and none of them are worth publishing on a guess.
        </P>
      </section>
    </div>
  );
}

export function Sources() {
  return (
    <section className="border-t border-rule pt-6">
      <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Sources</h2>
      <ul className="mt-3 max-w-[68ch] space-y-2 text-sm text-inkSoft">
        <li>
          Phonology, tones, sandhi, initial assimilation, tight and loose rimes, and the
          Mandarin contrasts:{" "}
          <a
            href="https://en.wikipedia.org/wiki/Fuzhou_dialect"
            target="_blank"
            rel="noreferrer"
            className="text-lacquer hover:underline"
          >
            Fuzhou dialect
          </a>
          , Wikipedia.
        </li>
        <li>
          History and spelling conventions of Bàng-uâ-cê:{" "}
          <a
            href="https://en.wikipedia.org/wiki/B%C3%A0ng-u%C3%A2-c%C3%AA"
            target="_blank"
            rel="noreferrer"
            className="text-lacquer hover:underline"
          >
            Bàng-uâ-cê
          </a>
          , Wikipedia.
        </li>
        <li>
          Tone values, tone names, isolation examples and the complete bi-syllabic sandhi grid: the
          printed Fuzhounese&ndash;English dictionary whose transcription system the entries here
          follow. <i>Full citation to be added.</i>
        </li>
        <li>
          The Wikipedia articles are used under CC BY-SA, the same licence as this dictionary.
          Assimilation examples are drawn from entries in this dictionary. Tone values and sandhi
          rules are factual data rather than authored prose, but the source deserves crediting and
          will be named here.
        </li>
      </ul>
    </section>
  );
}

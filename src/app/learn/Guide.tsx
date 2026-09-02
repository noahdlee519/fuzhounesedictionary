import Link from "next/link";

/* ---------------------------------------------------------------------------
   The teaching half of /learn.

   SOURCING RULE: every linguistic claim here comes from one of the references
   in <Sources/>, or from the site's own entries. Nothing is written from
   memory. Anything not confirmed by a speaker carries <Unchecked/> — do not
   quietly promote such an item to plain text.

   VOICE: plain and short. No triads, no "the single most important thing",
   no paragraph that exists only to summarise the paragraph above it. Match
   the About page.

   Sections are <details> so the page can be skimmed. The id sits on the
   <details> element, not the heading, so a link from the contents bar still
   lands somewhere visible when the section is shut.
   --------------------------------------------------------------------------- */

export const SECTIONS = [
  { id: "what", label: "What it is" },
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

/** Not yet confirmed by a speaker. Shown on purpose. */
const Unchecked = () => (
  <span
    title="Not yet checked by a speaker"
    className="ml-2 whitespace-nowrap border border-rule px-1.5 py-0.5 align-middle font-mono text-[10px] uppercase tracking-wide text-inkFaint"
  >
    unchecked
  </span>
);

function Section({
  id,
  title,
  open = true,
  children,
}: {
  id: string;
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} open={open} className="group scroll-mt-24 border-t border-rule">
      <summary className="flex cursor-pointer list-none items-baseline gap-3 py-4 marker:content-none">
        <span
          aria-hidden
          className="mt-0.5 font-mono text-sm text-inkFaint transition-transform group-open:rotate-90"
        >
          &#9656;
        </span>
        <h2 className="font-display text-xl font-bold uppercase tracking-tight group-hover:text-lacquer sm:text-2xl">
          {title}
        </h2>
      </summary>
      <div className="space-y-4 pb-8 pl-0 sm:pl-7">{children}</div>
    </details>
  );
}

const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[32rem] border-collapse text-left text-[15px]">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th
              key={i}
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

/* --------------------------------------------------------- tone contours */
/* Pitch digits drawn on the five-point scale. Level 5 is the top line.
   The checked tones are drawn short, because they are short. */
// han/buc: a Bàng-uâ-cê example word carrying the tone. UNCHECKED — the
// diacritic-to-tone mapping is reconstructed, not yet confirmed from a printed
// source (only the breve on 陰平/陽入 is source-confirmed), so the cards flag it.
const TONES: {
  name?: string; pitch: string; levels: number[]; short?: boolean; extra?: boolean;
  han?: string; buc?: string;
  /** the romanization is a dictionary entry in tone digits, not a reconstructed mark */
  cited?: boolean;
}[] = [
  { name: "陰平", pitch: "44", levels: [4, 4], han: "天", buc: "tiĕng" },
  { name: "陽平", pitch: "53", levels: [5, 3], han: "儂", buc: "nè̤ng" },
  { name: "上聲", pitch: "31", levels: [3, 1], han: "我", buc: "nguāi" },
  { name: "陰去", pitch: "213", levels: [2, 1, 3], han: "四", buc: "sé" },
  { name: "陽去", pitch: "242", levels: [2, 4, 2], han: "二", buc: "nê" },
  { name: "陰入", pitch: "23", levels: [2, 3], short: true, han: "福", buc: "hók" },
  { name: "陽入", pitch: "5", levels: [5, 5], short: true, han: "日", buc: "nĭk" },
  // The eighth is one of the two tones (21 / 24) that only surface inside a
  // word, so its example is the first syllable of a two-syllable entry: 二 is
  // 242 on its own and 21 at the front of 二八天.
  { pitch: "21", levels: [2, 1], extra: true, han: "二八天", buc: "ni21 weik21 tieng44", cited: true },
];

function ToneGlyph({ levels, short }: { levels: number[]; short?: boolean; extra?: boolean }) {
  const W = 100; // 88 of chart, then the 1–5 labels down the right
  const H = 64;
  const PAD = 6;
  const RIGHT = 18; // space for the labels
  const span = short ? (W - RIGHT - PAD * 2) * 0.5 : W - RIGHT - PAD * 2;
  const y = (lvl: number) => PAD + ((5 - lvl) / 4) * (H - PAD * 2);
  const pts = levels
    .map((lvl, i) => `${PAD + (levels.length === 1 ? 0 : (i / (levels.length - 1)) * span)},${y(lvl)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-hidden className="block">
      {[1, 2, 3, 4, 5].map((lvl) => (
        <g key={lvl}>
          <line
            x1={PAD}
            x2={W - RIGHT - PAD}
            y1={y(lvl)}
            y2={y(lvl)}
            stroke="currentColor"
            strokeWidth={lvl === 1 || lvl === 5 ? 0.9 : 0.5}
            className="text-rule"
          />
          {/* the scale, 5 high to 1 low, so the digits in "213" can be read off */}
          <text
            x={W - RIGHT + 5}
            y={y(lvl)}
            dominantBaseline="central"
            fontSize="7.5"
            fill="currentColor"
            className="font-mono text-inkFaint"
          >
            {lvl}
          </text>
        </g>
      ))}
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-lacquer"
      />
    </svg>
  );
}

export const ToneChart = () => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
    {TONES.map((t) => (
      <figure
        key={t.pitch}
        className="border border-rule bg-surface p-3"
      >
        <div className="text-rule">
          <ToneGlyph levels={t.levels} short={t.short} extra={t.extra} />
        </div>
        <figcaption className="mt-2 flex items-baseline justify-between gap-2 border-t border-rule pt-2">
          <span className="font-mono text-lg font-semibold leading-none tabular-nums text-ink">
            {t.pitch}
          </span>
          {t.name ? (
            <span className="font-display text-sm text-inkSoft">{t.name}</span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wide text-inkFaint">in-word</span>
          )}
        </figcaption>
        {t.buc && (
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
            <span className="font-display font-semibold text-ink">{t.han}</span>
            {t.cited ? (
              <span className="romanization italic text-inkSoft">{t.buc}</span>
            ) : (
              <span
                title="Bàng-uâ-cê—unchecked: the mark-to-tone mapping isn't confirmed yet"
                className="romanization italic text-inkSoft underline decoration-dotted decoration-inkFaint underline-offset-2"
              >
                {t.buc}
              </span>
            )}
          </div>
        )}
      </figure>
    ))}
  </div>
);

/* ------------------------------------------------------------ sandhi grid */
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
    <table className="w-full min-w-[34rem] border-collapse text-center text-[15px]">
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
              +{t}
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
      Grey means the first syllable stays as it was.
    </p>
  </div>
);

export function Contents() {
  return (
    <nav
      aria-label="On this page"
      className="sticky top-0 z-20 -mx-5 border-b border-rule bg-paper/95 px-5 py-3 backdrop-blur"
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
    <div>
      <Section id="what" title="What it is" open>
        <P>
          Fuzhounese is the Fuzhou variety of Eastern Min, which is one of the main branches of
          Chinese. It is spoken in about eleven cities and counties of eastern Fujian, and in the
          Matsu Islands.
        </P>
        <P>
          A Mandarin speaker cannot understand it. Neither can a Cantonese or Hokkien speaker. By the
          usual test that makes it a language, not a dialect, though almost everyone calls it a
          dialect and this site does too.
        </P>
        <P>
          Much of the everyday vocabulary is very old. A good deal of it is more than twelve hundred
          years old, and words that sound literary in Mandarin are ordinary here. <Han>囝</Han> is
          just the word for a child.
        </P>
        <div className="pt-1">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Start here</p>
          <ul className="mt-2 max-w-[68ch] list-disc space-y-1.5 pl-5 text-[17px] leading-relaxed text-inkSoft marker:text-lacquer">
            <li>
              <a href="#sounds" className="text-lacquer hover:underline">The sounds</a> — the
              consonants and vowels, and the two ways a syllable is allowed to end.
            </li>
            <li>
              <a href="#tones" className="text-lacquer hover:underline">The seven tones</a> — pitch
              on a five-point scale, with an example word carrying each one.
            </li>
            <li>
              <a href="#phrases" className="text-lacquer hover:underline">The phrasebook</a> — a few
              things to actually say, once the sounds make sense.
            </li>
          </ul>
        </div>
      </Section>

      <Section id="sounds" title="Sounds">
        <P>
          There are fifteen initial consonants and seven vowels. The vowels combine with the two
          possible endings to make forty-six rimes.
        </P>
        <P>
          Two things surprise people who come from Mandarin. There is no <b>f</b> and no <b>v</b>,
          anywhere; no branch of Min has them. And the endings have collapsed. Old{" "}
          <Rom>-m</Rom>, <Rom>-n</Rom> and <Rom>-ng</Rom> all became <Rom>-ng</Rom>. Old{" "}
          <Rom>-p</Rom>, <Rom>-t</Rom> and <Rom>-k</Rom> all became a glottal stop, the catch in
          the middle of &ldquo;uh-oh&rdquo;. A syllable can end in a vowel, in <Rom>-ng</Rom>, or in
          that catch. Nothing else.
        </P>
        <P>
          One oddity to keep in the back of your mind. The old <Rom>-k</Rom> and the old glottal
          stop sound the same now, but they still behave differently when another syllable follows.
          That comes up under initial assimilation.
        </P>
      </Section>

      <Section id="tones" title="Tones">
        <P>
          Seven tones, and two more that only show up inside longer words. Pitch is written on a
          five-point scale where <Num>5</Num> is highest and <Num>1</Num> is lowest, so{" "}
          <Num>44</Num> sits high and flat and <Num>53</Num> starts high and drops.
        </P>
        <ToneChart />
        <p className="max-w-[68ch] text-sm text-inkFaint">
          The word under each box is a Bàng-uâ-cê example carrying that tone. Its romanization is
          dotted because it is <Unchecked /> the mark-to-tone mapping is reconstructed, and only the
          breve on <Han>陰平</Han> and <Han>陽入</Han> is confirmed from a source; the rest await a
          printed one.
        </p>
        <Table
          head={["", "Name", "Pitch", "Example"]}
          rows={[
            ["1", <>陰平 yīnpíng</>, <Num>44</Num>, <><Han>伊</Han> <Rom>i44</Rom>{" he, she"}</>],
            ["2", <>陽平 yángpíng</>, <Num>53</Num>, <><Han>姨</Han> <Rom>i53</Rom>{" aunt"}</>],
            ["3", <>上聲 shǎngshēng</>, <Num>31</Num>, <><Han>以</Han> <Rom>i31</Rom>{" with which"}</>],
            ["4", <>陰去 yīnqù</>, <Num>213</Num>, <><Han>亿</Han> <Rom>ei213</Rom>{" hundred million"}</>],
            ["5", <>陽去 yángqù</>, <Num>242</Num>, <><Han>味</Han> <Rom>ei242</Rom>{" smell"}</>],
            ["6", <>陰入 yīnrù</>, <Num>23</Num>, <><Han>一</Han> <Rom>eik23</Rom>{" one"}</>],
            ["7", <>陽入 yángrù</>, <Num>5</Num>, <><Han>译</Han> <Rom>ik5</Rom>{" to translate"}</>],
          ]}
        />
        <P>
          Three of them are not quite what the numbers say. Tone 3 is written <Num>31</Num> as if it
          fell, but it comes out closer to a flat <Num>33</Num>; two of them in a row are completely
          level. Tone 4 is written <Num>213</Num>, but the rise at the end is rarely there, so it
          usually lands as a low fall. Tone 1 is <Num>44</Num> before a <Num>53</Num> or a{" "}
          <Num>5</Num>, but a run of <Num>44</Num> syllables together climbs to a full{" "}
          <Num>55</Num>.
        </P>
        <P>
          Tones 6 and 7 are the short ones, on syllables that end in the glottal stop. That is why
          the two short boxes above, <Num>23</Num> and <Num>5</Num>, are drawn half as wide.
        </P>
        <P>
          The two extra tones are <Num>21</Num> and <Num>24</Num>. You will never hear them on a
          word said by itself; the box above marked <i>in-word</i> is the <Num>21</Num>, shown on the first syllable of <Han>二八天</Han>.
        </P>
      </Section>

      <Section id="sandhi" title="Tone sandhi">
        <P>
          The seven tones above are the tones a syllable has when it stands alone. Put two syllables
          together and the first one changes. If you learn a word from this dictionary and say it
          syllable by syllable, it will not sound like the language.
        </P>
        <P>
          The rule is short. <b>The last syllable keeps its tone. The one before it does not.</b>{" "}
          Find your first syllable down the side, the syllable that follows it along the top, and the
          cell tells you what the first one turns into.
        </P>
        <SandhiGrid />
        <P>
          The grid shows a couple of things a list of rules would hide. Tones 1 and 2 behave the same
          way in first position, so the top two rows are identical. <Num>31</Num> before another{" "}
          <Num>31</Num> is one of the few combinations that stays put. And a following <Num>31</Num>{" "}
          drags nearly everything before it down.
        </P>
        <P>
          Where there are two values, both get said. It depends on the short tones: a syllable in
          tone 6 or 7 sometimes holds its glottal ending firmly and sometimes lets it go soft, and
          the tone follows suit. Entries here use whichever matches the word as people say it, which
          is why two entries can look inconsistent.
        </P>
        <P>
          Longer words work in pairs. A four-syllable word behaves roughly like two two-syllable
          words in a row, so the same grid does the job twice.
        </P>
        <div className="border-l-2 border-lacquer bg-surface p-4">
          <p className="max-w-[62ch] text-sm text-inkSoft">
            Three of the printed rules change the <i>last</i> syllable as well, which cuts against
            everything else in the table. One of them cites a tone that does not exist. They are
            reproduced as printed rather than tidied up, on the grounds that a mistake in a source is
            better left visible.
          </p>
        </div>
      </Section>

      <Section id="assimilation" title="Initial assimilation">
        <P>
          Tones are not the only thing that shifts. When one syllable follows another inside a word,
          its opening consonant changes to suit the ending of the syllable before it. This is very
          characteristic of Eastern Min, and it is why the same character can look different from one
          entry to the next.
        </P>
        <Table
          head={["Initial", "After a vowel or glottal stop", "After -ng", "After -k"]}
          rows={[
            [<>p, pʰ</>, "β", "m", "no change"],
            [<>t, tʰ, s</>, "l", "n", "no change"],
            [<>k, kʰ, h</>, "dropped", "ŋ", "no change"],
            [<>ts, tsʰ</>, "ʒ", "—", "no change"],
            [<>m, n, ŋ</>, "no change", "no change", "no change"],
            [<>l</>, "—", "n", "no change"],
          ]}
        />
        <P>
          You can watch it happen in this dictionary. <Han>八</Han> on its own is <Rom>baik</Rom>.
          In <Han>二八天</Han> <Rom>ni21 weik21 tieng44</Rom> it comes after a vowel, so the p goes
          soft. In <Han>七讲八昕</Han> <Rom>cik21 goung21 meik5 tiang213</Rom> it comes after an{" "}
          <Rom>-ng</Rom>, so the same p becomes an m. One character, three consonants, depending on
          what it is standing next to.
        </P>
        <P>
          Look at the last column. The old <Rom>-k</Rom> sets off nothing at all, while the old
          glottal stop sets off the whole first column, even though the two sound alike today.
          Speakers also vary, and set phrases go their own way, so the dictionary will occasionally
          disagree with itself.
        </P>
      </Section>

      <Section id="rimes" title="Tight and loose rimes">
        <P>
          A third thing changes: the vowel itself. Every rime has a tight form and a loose form, and
          which one you get depends on the tone. Tones 1, 3, 2 and 7 take the tight form; tones 4, 6
          and 5 take the loose one.
        </P>
        <P>
          In sandhi, a loose rime tightens up. The name of the city shows it. <Han>福</Han> by
          itself is [hɔuʔ], but in <Han>福州</Han> it becomes [huʔ]. The tone changes and the vowel
          goes with it. This one is optional, unlike the tone sandhi, and whether a speaker does it
          can carry a difference in meaning.
        </P>
        <P>Almost no other Chinese variety does this.</P>
      </Section>

      <Section id="writing" title="Writing it down">
        <P>
          There is no standard romanization, which is why this dictionary takes whatever system a
          contributor already uses.
        </P>
        <P>
          Most entries here write the tone as digits after each syllable: <Rom>seik21 zo213</Rom>.
          The digits are the pitch values from the tone table. Because they record the tone as
          spoken, they show you the sandhi that a tone mark on a dictionary headword would hide.{" "}
          <Rom>seik21</Rom> is tone 7 bent by the syllable after it, not a tone in its own right.
        </P>
        <P>
          <b>Bàng-uâ-cê</b> is the old system. An American missionary, M. C. White, made the first
          attempt in the 1850s; Robert S. Maclay, R. W. Stewart and Charles Hartwell worked it into a
          settled form by the 1890s. Two things about it trip people up. <Rom>b</Rom>, <Rom>d</Rom>,{" "}
          <Rom>g</Rom> and <Rom>c</Rom> are the unaspirated sounds and <Rom>p</Rom>, <Rom>t</Rom>,{" "}
          <Rom>k</Rom> and <Rom>ch</Rom> the aspirated ones, so <Rom>b</Rom> is not voiced the way an
          English b is. And vowel quality is marked underneath the letter (<Rom>a̤ e̤ o̤ ṳ</Rom>),
          leaving the space above it free for the tone. It never travelled much beyond the mission
          churches.
        </P>
        <div className="border-l-2 border-lacquer bg-surface p-4">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">Missing</p>
          <p className="mt-2 max-w-[62ch] text-sm text-inkSoft">
            A confirmed Bàng-uâ-cê mark for each tone. The Tones section now shows a reconstructed
            mapping, flagged unchecked; only the breve on <Han>陰平</Han> and <Han>陽入</Han> is
            source-backed so far. The rest will be settled from a printed source.
          </p>
        </div>
      </Section>

      <Section id="grammar" title="Grammar">
        <P>
          If you know any Chinese variety, the shape of this will be familiar. Words do not change
          form. Nouns have no plural ending and no case. Verbs do not conjugate. There is no
          grammatical gender. Word order and a handful of small particles do the work that endings do
          in European languages.
        </P>
        <Table
          head={["", "Fuzhounese", "Compare"]}
          rows={[
            ["Word order", "Subject, verb, object", "like English"],
            ["Case", "None. Position tells you who did what", "unlike Latin or Russian"],
            ["Tense", "Not marked on the verb. Adverbs set the time, particles mark completion", "unlike English -ed"],
            ["Counting", "A measure word goes between the number and the noun", "like Mandarin 個"],
            ["Possession", "Owner first, joined by a particle", "like Mandarin 的"],
            ["Questions", "A particle at the end, or a negative. The verb does not move", "unlike English"],
          ]}
        />
        <P>
          The particles themselves are the interesting part, and the sources available to us do not
          set them out properly.
          <Unchecked /> Rather than borrow the Mandarin ones and hope, they will get filled in from a
          printed grammar or from speakers.
        </P>
      </Section>

      <Section id="mandarin" title="Against Mandarin">
        <P>
          Written down, a Fuzhounese sentence is often more or less readable to anyone literate in
          Chinese, because most of the words have relatives elsewhere. Spoken, it is not intelligible
          at all.
        </P>
        <Table
          head={["", "Fuzhounese", "Mandarin"]}
          rows={[
            ["Tones", "7", "4"],
            ["f and v", "none", "f yes"],
            ["Syllable endings", "vowel, -ng, glottal stop", "vowel, -n, -ng"],
            ["Tone sandhi", "everywhere, reshaping every non-final syllable", "limited"],
            ["Consonants shifting inside a word", "yes", "no"],
            ["Vowels changing with tone", "yes", "no"],
          ]}
        />
        <P>
          Watch out for words that look transparent and are not. <Han>莫細膩</Han> means{" "}
          <i>make yourself at home</i>. Read through Mandarin it looks like it should mean
          &ldquo;don&apos;t be fussy&rdquo;.
        </P>
      </Section>

      <Section id="phrases" title="Phrasebook">
        <div className="border-l-2 border-lacquer bg-surface p-4">
          <p className="max-w-[64ch] text-sm text-inkSoft">
            This is the thinnest part of the site and the hardest to fill honestly. A phrase with the
            wrong tone on it teaches someone a different word, so nothing goes in here on a guess.
            What is listed is either traceable to a published source or already an entry in this
            dictionary, and it is all marked unchecked until a speaker confirms it.{" "}
            <Link href="/request" className="text-lacquer hover:underline">
              If you speak Fuzhounese, this is the section that needs you.
            </Link>
          </p>
        </div>

        <h3 className="pt-2 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          Asking things
        </h3>
        <Table
          head={["English", "Characters", "Pronunciation", ""]}
          rows={[
            ["what", <Han>乜毛</Han>, <Rom>mie53 nok23</Rom>, <Unchecked />],
            ["what (also)", <Han>乜毛名</Han>, <Rom>mie21 nok44 miang53</Rom>, <Unchecked />],
            ["when", <Han>乜候</Han>, <Rom>mieng53 ngau242</Rom>, <Unchecked />],
            ["why, what for", <Han>干乜势</Han>, <Rom>gang21 me53 lie213</Rom>, <Unchecked />],
            ["Do you speak Fuzhounese?", <Han>汝會講福州話賣？</Han>, <Rom>—</Rom>, <Unchecked />],
          ]}
        />

        <h3 className="pt-2 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          Yes, no, and getting by
        </h3>
        <Table
          head={["English", "Characters", "Pronunciation", ""]}
          rows={[
            ["no, it is not", <Han>伓是</Han>, <Rom>ng-sê</Rom>, <Unchecked />],
            ["not wrong", <Han>無綻</Han>, <Rom>mò̤ dâng</Rom>, <Unchecked />],
            ["make yourself at home", <Han>莫細膩</Han>, <Rom>—</Rom>, <Unchecked />],
            ["to know, to be acquainted with", <Han>八</Han>, <Rom>baik23</Rom>, <Unchecked />],
          ]}
        />

        <h3 className="pt-2 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          Still to come
        </h3>
        <P>
          Greetings. Numbers. Times of day. Family. Ordering food. Directions. Every one of these is
          more useful than everything above, and none of them are worth publishing wrong. They will
          be added from recordings.
        </P>
      </Section>
    </div>
  );
}

export function Sources() {
  return (
    <section className="border-t border-rule pt-6">
      <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Sources</h2>
      <ul className="mt-3 max-w-[68ch] space-y-2 text-sm text-inkSoft">
        <li>
          Tone values and names, the isolation examples, and the whole bi-syllabic sandhi grid come
          from the printed Fuzhounese&ndash;English dictionary whose transcription this site follows.{" "}
          <i>Full citation to follow.</i>
        </li>
        <li>
          Consonants, rimes, initial assimilation, tight and loose rimes, and the comparisons with
          Mandarin:{" "}
          <a
            href="https://en.wikipedia.org/wiki/Fuzhou_dialect"
            target="_blank"
            rel="noreferrer"
            className="text-lacquer hover:underline"
          >
            Fuzhou dialect
          </a>
          , Wikipedia. The history of Bàng-uâ-cê:{" "}
          <a
            href="https://en.wikipedia.org/wiki/B%C3%A0ng-u%C3%A2-c%C3%AA"
            target="_blank"
            rel="noreferrer"
            className="text-lacquer hover:underline"
          >
            Bàng-uâ-cê
          </a>
          , Wikipedia. Both are CC BY-SA, the same licence as this dictionary.
        </li>
        <li>
          The assimilation examples and the question words in the phrasebook are entries from this
          dictionary.
        </li>
      </ul>
    </section>
  );
}

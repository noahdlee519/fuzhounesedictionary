import type { Panel } from "./LearnPanels";
import { ToneChart, Table } from "./Guide";
import { pick, type Lang } from "@/lib/i18n";

/* The three short panels above the word list. Digests of the longer guide in
   Guide.tsx, and held to the same rule: every claim traces to a source named
   in Sources, or to an entry in this dictionary. Nothing from memory.
   Voice: plain and short.

   Bilingual: each panel is built for one language, so the bodies are
   functions of `lang` rather than module-level JSX. Prose that interleaves
   Fuzhounese examples branches per paragraph on `zh`; the examples themselves
   (hanzi, Bàng-uâ-cê, tone digits, IPA) are identical in both branches.
   The Chinese is Traditional (Taiwan-standard), like the rest of the site's
   zh copy; glosses use 「」 rather than italics. */

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="leading-relaxed text-inkSoft">{children}</p>
);

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="meta text-lacquer">{children}</h3>
);

const Han = ({ children }: { children: React.ReactNode }) => (
  <span className="font-display font-semibold text-ink">{children}</span>
);

const Rom = ({ children }: { children: React.ReactNode }) => (
  <span className="romanization text-ink">{children}</span>
);

const Num = ({ children }: { children: React.ReactNode }) => (
  <span className="tabular-nums text-ink">{children}</span>
);

const Block = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <div id={id} className="scroll-mt-24 space-y-3">{children}</div>
);

/* Anchors that live inside a panel, so a link like "#tones" can open the
   right panel first. LearnPanels reads this. */
export const panelAnchors: Record<string, string> = { tones: "features" };

/* ------------------------------------------------------------------------ */

function features(lang: Lang) {
  const L = pick(lang);
  const zh = lang === "zh";
  return (
    <>
      <P>
        {zh ? (
          <>
            福州話是閩東語的一種，通行於福州市一帶。寫成文字時，懂普通話、粵語等其他漢語方言的人往往看得懂；但說出來的話卻完全是另一回事。
          </>
        ) : (
          <>
            Fuzhounese is the variety of Eastern Min Chinese spoken around the city of Fuzhou. Written
            down, it is often legible for those literate in other Chinese dialects like Mandarin and
            Cantonese. However, the spoken form is altogether different.
          </>
        )}
      </P>

      <Block>
        <H>{L("Word order", "語序")}</H>
        <P>
          {zh ? (
            <>
              主語、動詞、賓語——和英文、普通話的語序相同。詞不會變形：名詞沒有複數詞尾，也沒有格；動詞不變位；也沒有語法上的性。歐洲語言靠詞尾做的事，福州話靠詞的位置和少數幾個小助詞來做。所有格裡，擁有者在前。動詞本身不標時態：由副詞交代時間，再用一個助詞表示某件事已經完成。
            </>
          ) : (
            <>
              Subject, verb, object—the same order as English and Mandarin. Words do not change form:
              nouns have no plural ending and no case, verbs do not conjugate, and there is no grammatical
              gender. Position and a handful of small particles do the work that endings do in European
              languages. The owner comes first in a possessive. Tense is not marked on the verb: an adverb
              sets the time, and a particle marks that something is done.
            </>
          )}
        </P>
      </Block>

      <Block>
        <H>{L("Questions", "疑問句")}</H>
        <P>
          {zh ? (
            <>
              動詞留在原位。句末加一個助詞，陳述句就變成是非問句——<Han>汝會講福州話賣？</Han>{" "}
              <Rom>Nṳ̄ â̤ gōng Hók-ciŭ-uâ mâ̤</Rom>，「你會說福州話嗎？」——句末加否定詞也有同樣的作用。句末的{" "}
              <Han>未</Han> <Rom>mà̤</Rom> 是問某件事發生了沒有：<Han>食飯未</Han>{" "}
              <Rom>siăh buáng mà̤</Rom>，「吃飯了沒？」，這也是大家打招呼的說法。
            </>
          ) : (
            <>
              The verb stays where it is. A particle at the end turns a statement into a yes-or-no
              question—<Han>汝會講福州話賣？</Han> <Rom>Nṳ̄ â̤ gōng Hók-ciŭ-uâ mâ̤</Rom>,{" "}
              <i>do you speak Fuzhounese?</i>—or a negative does
              the same job. <Han>未</Han> <Rom>mà̤</Rom> at the end asks whether something has happened
              yet: <Han>食飯未</Han> <Rom>siăh buáng mà̤</Rom>, <i>have you eaten?</i>, which is also how
              people say hello.
            </>
          )}
        </P>
      </Block>

      <Block>
        <H>{L("Measure words", "量詞")}</H>
        <P>
          {zh ? (
            <>
              數字不能直接加在名詞上，中間要放一個量詞；用哪一個，要看所數的東西屬於哪一類：書用{" "}
              <Han>本</Han> <Rom>buōng</Rom>，扁平的東西用 <Han>張</Han> <Rom>ciŏng</Rom>，長條的用{" "}
              <Han>條</Han> <Rom>diu</Rom>，有把手的用 <Han>把</Han> <Rom>bā</Rom>，房間和建築用{" "}
              <Han>間</Han> <Rom>gèng</Rom>，機器用 <Han>架</Han> <Rom>gá</Rom>，動物用{" "}
              <Han>隻</Han> <Rom>ciáh</Rom>。所以 <Han>蜀本書</Han> <Rom>suŏh buōng cṳ̄</Rom> 就是「一本書」。
            </>
          ) : (
            <>
              You cannot put a number straight onto a noun. A measure word goes between them, and which one
              depends on the kind of thing being counted: <Han>本</Han> <Rom>buōng</Rom> for books,{" "}
              <Han>張</Han> <Rom>ciŏng</Rom> for flat things, <Han>條</Han> <Rom>diu</Rom> for long ones,{" "}
              <Han>把</Han> <Rom>bā</Rom> for things with a handle, <Han>間</Han> <Rom>gèng</Rom> for rooms
              and buildings, <Han>架</Han> <Rom>gá</Rom> for machines, <Han>隻</Han> <Rom>ciáh</Rom> for
              animals. So <Han>蜀本書</Han> <Rom>suŏh buōng cṳ̄</Rom>, <i>a book</i>.
            </>
          )}
        </P>
      </Block>

      <Block id="tones">
        <H>{L("Tones", "聲調")}</H>
        <P>
          {zh ? (
            <>
              一個字單獨唸時有七個聲調。音高用五度標記，<Num>5</Num> 最高，<Num>1</Num> 最低：
              <Han>陰平</Han> <Num>44</Num>、<Han>陽平</Han> <Num>53</Num>、<Han>上聲</Han>{" "}
              <Num>31</Num>、<Han>陰去</Han> <Num>213</Num>、<Han>陽去</Han> <Num>242</Num>、
              <Han>陰入</Han> <Num>23</Num>、<Han>陽入</Han> <Num>5</Num>。最後兩個是短調，出現在以喉塞音結尾的音節上——喉塞音就是英文
              &ldquo;uh-oh&rdquo; 中間那一下頓住。另有兩個聲調只出現在較長的詞裡；最後一格就是其中之一，見於{" "}
              <Han>八音</Han> 的第一個音節。
            </>
          ) : (
            <>
              There are seven tones on a word said by itself. Pitch is written on a five-point scale, <Num>5</Num>{" "}
              high and <Num>1</Num> low: <Han>陰平</Han> <Num>44</Num>, <Han>陽平</Han> <Num>53</Num>,{" "}
              <Han>上聲</Han> <Num>31</Num>, <Han>陰去</Han> <Num>213</Num>, <Han>陽去</Han>{" "}
              <Num>242</Num>, <Han>陰入</Han> <Num>23</Num>, <Han>陽入</Han> <Num>5</Num>. The last two are
              short, on syllables that end in a glottal stop—the catch in the middle of
              &ldquo;uh-oh&rdquo;. Two more tones appear only inside longer words; the last box is one of
              them, heard on the first syllable of <Han>八音</Han>.
            </>
          )}
        </P>
        <div className="pt-1">
          <ToneChart lang={lang} />
        </div>
        <p className="text-sm text-inkFaint">
          {L(
            "The word at the foot of each box carries that tone, with its meaning in English. The two short lines are the entering tones, cut off by the glottal stop.",
            "每格底下的字詞帶有該聲調，並附中文釋義。兩條短線是入聲，被喉塞音截斷。",
          )}
        </p>
      </Block>

      <Block>
        <H>{L("Tone sandhi", "變調")}</H>
        <P>
          {zh ? (
            <>
              表中的聲調，是一個音節<b>單獨</b>唸時的聲調。在詞裡就不一樣了。規則分兩半：
              <b>詞的最後一個音節保留本調。</b>
              <b>它前面的音節會變調</b>，變成什麼調，取決於前後兩個音節。這叫做「變調」，是福州話獨特卻也難學的特點。
            </>
          ) : (
            <>
              The tone in the table is the tone a syllable has <i>on its own</i>. Inside a word it is
              different. The rule has two halves. <b>The last syllable of a word keeps its own tone.</b>{" "}
              <b>The syllable before it changes</b>, and what it changes to depends on both syllables.
              This is called &ldquo;sandhi&rdquo; and it is a unique yet difficult feature of Fuzhounese.
            </>
          )}
        </P>
        <P>
          {zh ? (
            <>
              以城市名 <Han>福州</Han> <Rom>Hók-ciŭ</Rom> 為例。<Han>福</Han> 單獨唸是短促的升調{" "}
              <Num>23</Num>；<Han>州</Han> 單獨唸是高平調 <Num>44</Num>。兩字連在一起時，<Han>州</Han>{" "}
              在最後，所以維持 <Num>44</Num>；<Han>福</Han> 卻降成低調 <Num>21</Num>，這是它單獨時從來不會有的音高。所以這個詞唸作{" "}
              <Rom>huk21 ciu44</Rom>，而不是 <Rom>hok23 ciu44</Rom>。
            </>
          ) : (
            <>
              Take the name of the city, <Han>福州</Han> <Rom>Hók-ciŭ</Rom>. <Han>福</Han> by itself is a
              short rising tone, <Num>23</Num>. <Han>州</Han> by itself is high and level, <Num>44</Num>.
              Said together, <Han>州</Han> stays at <Num>44</Num> because it is last, but <Han>福</Han>{" "}
              drops to a low <Num>21</Num>, a pitch it never has when alone. So the word is{" "}
              <Rom>huk21 ciu44</Rom>, not <Rom>hok23 ciu44</Rom>.
            </>
          )}
        </P>
        <P>
          {zh ? (
            <>
              所以，照著字面一個音節一個音節唸出來，聽起來並不像福州話；平話字詞目上的聲調符號也不能直接照唸：它們標的是每個音節單獨時的聲調。用聲調數字寫的詞條，例如{" "}
              <Rom>seik21 zo213</Rom>，就不同了：記下的是實際說出來的聲調，變調已經算進去了。較長的詞是兩兩一組地變，所以四個音節的詞，大致就像兩個雙音節詞連在一起。實用的建議是：每個詞整個學，跟著錄音學，而不是把各個部分拼湊起來。
            </>
          ) : (
            <>
              This is why a word read off the page syllable by syllable does not sound like the language,
              and why the tone marks on a Bàng-uâ-cê headword cannot simply be read aloud: they give each
              syllable&apos;s tone in isolation. Entries written with tone numbers, like{" "}
              <Rom>seik21 zo213</Rom>, are different: they record the tones as actually spoken, with the
              change already made. Longer words work in pairs, so a four-syllable word behaves roughly
              like two two-syllable words in a row. The practical advice is to learn each word whole, from
              a recording, rather than assembling it from its parts.
            </>
          )}
        </P>
      </Block>

      <Block>
        <H>{L("Consonants shift too", "聲母也會變")}</H>
        <P>
          {zh ? (
            <>
              會變的不只是聲調。在詞裡，音節<b>開頭</b>的輔音（聲母）會配合<b>前一個</b>音節的結尾而改變，也就是聲母類化。共有三種情況。
            </>
          ) : (
            <>
              Tones are not the only thing that moves. Inside a word, the consonant that <i>opens</i> a
              syllable changes to suit how the syllable <i>before</i> it ends. There are three cases.
            </>
          )}
        </P>
        <Table
          head={
            zh
              ? ["聲母", "在元音後", "在 -ng 後", "在 -k 後"]
              : ["Opening consonant", "After a vowel", "After -ng", "After -k"]
          }
          rows={[
            [<>b, p</>, L("softens to a loose b, [β]", "弱化成鬆的 b，[β]"), L("becomes m", "變成 m"), L("no change", "不變")],
            [<>d, t, s</>, L("become l", "變成 l"), L("become n", "變成 n"), L("no change", "不變")],
            [<>g, k, h</>, L("disappear", "脫落"), L("become ng", "變成 ng"), L("no change", "不變")],
            [<>c, ch</>, L("soften to [ʒ], the s of “measure”", "弱化成 [ʒ]，像英文 measure 裡的 s"), "—", L("no change", "不變")],
            [<>m, n, ng</>, L("no change", "不變"), L("no change", "不變"), L("no change", "不變")],
          ]}
        />
        <P>
          {zh ? (
            <>
              一個字就能看到這三種情況。<Han>八</Han> <Rom>báik</Rom> 以 b 開頭。在{" "}
              <Han>二八天</Han> <Rom>ni21 weik21 tieng44</Rom> 裡，它跟在元音後面，所以 b 變軟。在{" "}
              <Han>七讲八昕</Han> <Rom>cik21 goung21 meik5 tiang213</Rom> 裡，它跟在 <Rom>-ng</Rom>{" "}
              後面，同一個 b 就變成了 m。同一個字、三個不同的輔音，只看它旁邊是什麼。這就是為什麼同一個字在不同詞條裡可能拼得不一樣，也是為什麼你認得的詞，放進較長的詞裡可能就不容易聽出來。
            </>
          ) : (
            <>
              One word shows all three. <Han>八</Han> <Rom>báik</Rom>, <i>eight</i>, opens with a b. In{" "}
              <Han>二八天</Han> <Rom>ni21 weik21 tieng44</Rom> it follows a vowel, so the b goes soft. In{" "}
              <Han>七讲八昕</Han> <Rom>cik21 goung21 meik5 tiang213</Rom> it follows an <Rom>-ng</Rom>, so
              the same b becomes an m. Same character, three different consonants, depending only on its
              neighbour. This is why one character can be spelt differently from one entry to the next,
              and why a word you know may be hard to pick out inside a longer one.
            </>
          )}
        </P>
        <P>
          {zh ? (
            <>
              元音也會變。每個元音都有較緊和較鬆兩種形式（緊韻與鬆韻），由聲調決定出現哪一種；詞裡的聲調一變，元音也跟著變。
              <Han>福</Han> 單獨唸是 [hɔuʔ]，元音是鬆的；在 <Han>福州</Han>{" "}
              裡，隨著變調，它緊化成 [huʔ]。幾乎沒有其他漢語方言是這樣的。
            </>
          ) : (
            <>
              The vowel can move as well. Every vowel has a tighter and a looser form, and the tone decides
              which one you get; when the tone changes inside a word, the vowel follows it. <Han>福</Han>{" "}
              alone is [hɔuʔ], with the loose vowel; in <Han>福州</Han>, on its changed tone, it tightens
              to [huʔ]. Almost no other Chinese variety does this.
            </>
          )}
        </P>
      </Block>

      <Block>
        <H>{L("Sounds", "語音")}</H>
        <P>
          {zh ? (
            <>
              福州話一共有十四個輔音、七個元音。每個音怎麼唸，完整的表格請看「
              <a href="#orthography" className="text-lacquer hover:underline">
                拼寫
              </a>
              」分頁。如果你熟悉英文或普通話，有三點會特別顯眼：
            </>
          ) : (
            <>
              There are fourteen consonants and seven vowels in total. Visit the{" "}
              <a href="#orthography" className="text-lacquer hover:underline">
                Orthography
              </a>{" "}
              tab for the full chart of how each is said. Three things stand out if you have a background
              in English or Mandarin:
            </>
          )}
        </P>
        <P>
          {zh ? (
            <>
              <b>福州話沒有 f 和 v 的音。</b>普通話唸 f 的地方，福州話通常是 h：<Han>福</Han> 是{" "}
              <Rom>hók</Rom>，<Han>花</Han> 是 <Rom>huă</Rom>，<Han>風</Han> 是 <Rom>hŭng</Rom>。
            </>
          ) : (
            <>
              <b>Fuzhounese doesn&rsquo;t have an f or a v sound.</b> Where Mandarin has an f, Fuzhounese usually has
              an h: <Han>福</Han> is <Rom>hók</Rom>, <Han>花</Han> is <Rom>huă</Rom>, <Han>風</Han> is{" "}
              <Rom>hŭng</Rom>.
            </>
          )}
        </P>
        <P>
          {zh ? (
            <>
              <b>音節只有三種收尾。</b>字不是以元音結尾，就是以 <Rom>-ng</Rom>{" "}
              或喉塞音結尾（喉塞音就是英文 &ldquo;uh-oh&rdquo; 中間那一下頓住，寫作 <Rom>-h</Rom> 或{" "}
              <Rom>-k</Rom>）。古漢語以 <Rom>-m</Rom>、<Rom>-n</Rom> 或 <Rom>-ng</Rom>{" "}
              收尾的音節，福州話只剩下 <Rom>-ng</Rom>：<Han>心</Han> <Rom>sĭng</Rom>、<Han>山</Han>{" "}
              <Rom>săng</Rom>、<Han>新</Han> <Rom>sĭng</Rom>。其他漢語方言以 <Rom>-p</Rom>、<Rom>-t</Rom> 或{" "}
              <Rom>-k</Rom> 收尾的字，福州話一律以喉塞音收尾，寫作 <Rom>-h</Rom> 或 <Rom>-k</Rom>：
              <Han>十</Han> <Rom>sĕk</Rom>、<Han>白</Han> <Rom>băh</Rom>、<Han>八</Han> <Rom>báik</Rom>。
            </>
          ) : (
            <>
              <b>Only three ways to end a syllable.</b> Words either end in a vowel, with <Rom>-ng</Rom>,
              or with a glottal stop (i.e. the catch in the middle of &ldquo;uh-oh&rdquo;, written{" "}
              <Rom>-h</Rom> or <Rom>-k</Rom>). Where
              older Chinese ended syllables in <Rom>-m</Rom>, <Rom>-n</Rom> or <Rom>-ng</Rom>, Fuzhounese
              has only <Rom>-ng</Rom>: <Han>心</Han> <Rom>sĭng</Rom>, <Han>山</Han> <Rom>săng</Rom>,{" "}
              <Han>新</Han> <Rom>sĭng</Rom>. Where other Chinese words end in <Rom>-p</Rom>, <Rom>-t</Rom> or{" "}
              <Rom>-k</Rom>, Fuzhounese ends them all with the glottal stop, written <Rom>-h</Rom> or{" "}
              <Rom>-k</Rom>: <Han>十</Han> <Rom>sĕk</Rom>, <Han>白</Han>{" "}
              <Rom>băh</Rom>, <Han>八</Han> <Rom>báik</Rom>.
            </>
          )}
        </P>
        <P>
          {zh ? (
            <>
              <b>兩個英文沒有的元音。</b><Rom>ṳ</Rom> 是把英文的 <i>ee</i> 圓起嘴唇來唸，像法文的{" "}
              <i>tu</i>：<Han>雨</Han> <Rom>ṳ̄</Rom>、<Han>魚</Han> <Rom>ngṳ̀</Rom>。<Rom>e̤</Rom>{" "}
              是把 <i>eh</i> 圓起嘴唇來唸，像法文的 <i>peu</i>：<Han>讀</Han> <Rom>tĕ̤k</Rom>。字母下面的符號就是記號。
            </>
          ) : (
            <>
              <b>Two vowels English does not have.</b> <Rom>ṳ</Rom> is <i>ee</i> said with the lips
              rounded, as in French <i>tu</i>: <Han>雨</Han> <Rom>ṳ̄</Rom>, <Han>魚</Han> <Rom>ngṳ̀</Rom>.{" "}
              <Rom>e̤</Rom> is <i>eh</i> with the lips rounded, as in French <i>peu</i>: <Han>讀</Han>{" "}
              <Rom>tĕ̤k</Rom>. The mark underneath is the signal.
            </>
          )}
        </P>
      </Block>
    </>
  );
}

/* ------------------------------------------------------------------------ */

const ALPHABET_COLS = ["15%", "10%", "45%", "30%"];

function orthography(lang: Lang) {
  const L = pick(lang);
  const zh = lang === "zh";
  const IPA = L("IPA", "國際音標");
  const LIKE = L("Sounds like", "發音近似");
  const EX = L("Example", "例詞");
  return (
    <>
      <Block>
        <H>{L("Characters", "漢字")}</H>
        <P>
          {zh ? (
            <>
              福州話和普通話用同一套漢字書寫，大多數詞也和普通話的同源詞共用一個字——所以一句寫下來的福州話，讀中文的人通常多少看得懂，說出來卻聽不懂。有些日常詞保留了在別處聽來很文雅的字：
              <Han>囝</Han> <Rom>giāng</Rom> 就只是「孩子」，<Han>儂</Han> <Rom>nè̤ng</Rom> 是「人」，
              <Han>厝</Han> <Rom>chuó</Rom> 是「房子」。看起來眼熟的詞語，意思也可能不一樣：
              <Han>莫細膩</Han> <Rom>mŏ̤h-sá̤-nê</Rom> 是「別客氣，當自己家」，而不是「別挑剔」。
            </>
          ) : (
            <>
              Fuzhounese is written with the same Chinese characters as Mandarin, and most words share a
              character with their Mandarin relative—which is why a written sentence is usually more or
              less readable to anyone who reads Chinese, while the spoken language is not. Some ordinary
              words keep a character that sounds literary elsewhere: <Han>囝</Han> <Rom>giāng</Rom> is
              just the word for a child, <Han>儂</Han> <Rom>nè̤ng</Rom> a person, <Han>厝</Han>{" "}
              <Rom>chuó</Rom> a house. And a familiar-looking phrase can mean something else:{" "}
              <Han>莫細膩</Han> <Rom>mŏ̤h-sá̤-nê</Rom> is <i>make yourself at home</i>, not &ldquo;don&apos;t be fussy&rdquo;.
            </>
          )}
        </P>
      </Block>

      <Block>
        <H>{L("Romanization", "羅馬字")}</H>
        <P>
          {L(
            "There is no standard, and this dictionary accepts whichever system a contributor knows. Three are in use here: Bàng-uâ-cê, which most headwords are written in; Yngping, which any of those can be shown in instead; and tone numbers, used by the entries from a printed dictionary.",
            "羅馬字沒有統一的標準，本辭典接受投稿者熟悉的任何一套系統。這裡用到的有三套：大多數詞目使用的平話字；可以把這些詞目改用它來顯示的榕拼；以及取自印刷辭典的詞條所用的聲調數字。",
          )}
        </P>
        <P>
          {zh ? (
            <>
              <b>Bàng-uâ-cê</b> <Han>平話字</Han> 是較早的一套，大多數詞目都用它。美國傳教士在 1850
              年代開始制定，到 1890 年代在他們的{" "}
              <a
                href="https://en.wikisource.org/wiki/Dictionary_of_the_Foochow_Dialect"
                target="_blank"
                rel="noreferrer"
                className="text-lacquer hover:underline"
              >
                Dictionary of the Foochow Dialect
              </a>{" "}
              裡定型，列在「參考資料」中。有兩點容易讓人弄錯。第一，<Rom>b d g c</Rom> 是不送氣音，
              <Rom>p t k ch</Rom> 才是送氣音。所以 <Rom>b</Rom> 並不像英文的 b 那樣是濁音：它是英文
              &ldquo;spin&rdquo; 裡的 p，不像 &ldquo;pin&rdquo; 的 p 那樣帶一股氣。同樣地，<Rom>d</Rom>{" "}
              是 &ldquo;stop&rdquo; 裡的 t，<Rom>g</Rom> 是 &ldquo;skin&rdquo; 裡的 k，<Rom>c</Rom> 是
              &ldquo;cats&rdquo; 裡的 ts。第二，元音的音質標在字母下方（<Rom>a̤ e̤ o̤ ṳ</Rom>），字母上方留給聲調符號。例如{" "}
              <Han>乇</Han> <Rom>nó̤h</Rom>「東西」，o 下方的記號說明是哪一個 o，上方的記號則標出聲調。
            </>
          ) : (
            <>
              <b>Bàng-uâ-cê</b> <Han>平話字</Han> is the older one, and most headwords use it. American
              missionaries began it in the 1850s and settled it by the 1890s in their{" "}
              <a
                href="https://en.wikisource.org/wiki/Dictionary_of_the_Foochow_Dialect"
                target="_blank"
                rel="noreferrer"
                className="text-lacquer hover:underline"
              >
                Dictionary of the Foochow Dialect
              </a>
              , listed under Sources. Two things trip people up:{" "}
              <Rom>b d g c</Rom> are the <i>un</i>aspirated sounds and <Rom>p t k ch</Rom> the aspirated
              ones. So <Rom>b</Rom> is not voiced like an English b: it is the p of &ldquo;spin&rdquo;,
              without the puff of air that the p of &ldquo;pin&rdquo; has. In the same way <Rom>d</Rom> is
              the t of &ldquo;stop&rdquo;, <Rom>g</Rom> the k of &ldquo;skin&rdquo;, and <Rom>c</Rom> the
              ts of &ldquo;cats&rdquo;. And vowel quality is marked under the letter (<Rom>a̤ e̤ o̤ ṳ</Rom>),
              leaving the space above it for the tone mark. For example, in <Han>乇</Han> <Rom>nó̤h</Rom>,{" "}
              <i>thing</i>, the mark under the o says which o it is, and the mark above it gives the tone.
            </>
          )}
        </P>
        <P>
          {zh ? (
            <>
              這些聲調符號中，本辭典能確認的只有弧形的那一個，也就是短音符（breve）。它標在兩個平而不動的聲調上——
              <Num>44</Num>，高平的那一個；以及 <Num>5</Num>，與它相對的短調：<Han>天</Han>{" "}
              <Rom>tiĕng</Rom>「天空」、<Han>日</Han> <Rom>nĭk</Rom>「天」。其餘五個聲調各配哪個符號，這裡還沒有定論，所以「
              <a href="#tones" className="text-lacquer hover:underline">
                聲調
              </a>
              」底下的聲調卡帶有「未核實」的標記。
            </>
          ) : (
            <>
              The curved mark, the breve, is the one of those tone marks this dictionary can vouch for. It
              sits on the two tones that are level and unmoving—<Num>44</Num>, the high flat one, and{" "}
              <Num>5</Num>, its short counterpart: <Han>天</Han> <Rom>tiĕng</Rom>, <i>sky</i>, and{" "}
              <Han>日</Han> <Rom>nĭk</Rom>, <i>day</i>. Which mark goes with each of the other five is not
              settled here yet, which is why the tone cards under{" "}
              <a href="#tones" className="text-lacquer hover:underline">
                Tones
              </a>{" "}
              carry an <i>unchecked</i> flag.
            </>
          )}
        </P>
        <P>
          {zh ? (
            <>
              <b>Yngping</b> <Han>榕拼</Han> 是最新的一套，是線上辭典{" "}
              <a href="https://github.com/zingzeu/yngdieng" target="_blank" rel="noreferrer" className="text-lacquer hover:underline">
                榕典
              </a>{" "}
              使用的現代方案。它只用一般字母，聲調寫成每個音節後面的一個數字：<Han>福州話</Han>
              平話字寫作 <Rom>Hók-ciŭ-uâ</Rom>，榕拼寫作 <Rom>huk4 ziu1 ua7</Rom>。讀的時候要注意三個不同。不送氣和送氣的 ts 音，平話字寫 <Rom>c</Rom> 和{" "}
              <Rom>ch</Rom>，榕拼寫 <Rom>z</Rom> 和 <Rom>c</Rom>。圓唇元音平話字寫 <Rom>ṳ</Rom> 和{" "}
              <Rom>e̤</Rom>，榕拼寫 <Rom>y</Rom> 和 <Rom>oe</Rom>。還有，榕拼不管聲調，元音一律寫成緊韻：<Han>心</Han>{" "}
              <Rom>sĭng</Rom> 和 <Han>信</Han> <Rom>séng</Rom> 的元音會隨聲調變鬆，榕拼卻寫成 <Rom>sing1</Rom> 和{" "}
              <Rom>sing3</Rom>，光看數字就知道元音會變開。在詞條頁或「瀏覽」頁用 <b>BUC / 榕拼</b>{" "}
              切換，就能用任一套看整部辭典；榕拼是從平話字拼寫換算出來的，所以用聲調數字或投稿者自己拼法寫的詞，會照原樣顯示。
            </>
          ) : (
            <>
              <b>Yngping</b> <Han>榕拼</Han> is the newest, a modern scheme used by the online
              dictionary{" "}
              <a href="https://github.com/zingzeu/yngdieng" target="_blank" rel="noreferrer" className="text-lacquer hover:underline">
                榕典
              </a>
              . It keeps to plain letters and puts the tone in a digit after each syllable:{" "}
              <Han>福州話</Han> is <Rom>Hók-ciŭ-uâ</Rom> in Bàng-uâ-cê and <Rom>huk4 ziu1 ua7</Rom> in
              Yngping. Three differences matter when reading it. The letters for the unaspirated and
              aspirated ts-sounds are <Rom>z</Rom> and <Rom>c</Rom> where Bàng-uâ-cê has <Rom>c</Rom> and{" "}
              <Rom>ch</Rom>. The rounded vowels are <Rom>y</Rom> and <Rom>oe</Rom> where Bàng-uâ-cê has{" "}
              <Rom>ṳ</Rom> and <Rom>e̤</Rom>. And each vowel is written in its tight form whatever the tone,
              so <Han>心</Han> <Rom>sĭng</Rom> and <Han>信</Han> <Rom>séng</Rom>, whose vowels loosen with
              the tone, are <Rom>sing1</Rom> and <Rom>sing3</Rom>: the digit alone tells you the vowel will
              open. Use the <b>BUC / 榕拼</b> switch on a word&rsquo;s page or on Browse to see the whole
              dictionary either way; it is worked out from the Bàng-uâ-cê spelling, so a word written in
              tone numbers or in a contributor&rsquo;s own spelling stays as it was entered.
            </>
          )}
        </P>
        <P>
          {zh ? (
            <>
              <b>聲調數字</b>是在每個音節後面用數字寫出音高，如 <Rom>seik21 zo213</Rom>
              ，數值取自聲調表。因為記下的是實際說出來的聲調，詞目上的聲調符號所掩蓋的變調，它都看得出來。取自印刷辭典的詞條用的就是這套寫法，並會在附註中說明。這些數字是音高值，例如 <Num>44</Num> 或 <Num>213</Num>；榕拼的單一數字則是聲調在下表中的編號，不是音高。
            </>
          ) : (
            <>
              <b>Tone numbers</b> write the pitch as digits after each syllable, <Rom>seik21 zo213</Rom>,
              using the values from the tone table. Because they record the tone as actually spoken, they
              show the sandhi that a tone mark on a headword hides. Entries taken from a printed dictionary
              use this system and say so in their notes. These digits are pitch values, <Num>44</Num> or{" "}
              <Num>213</Num>; Yngping&rsquo;s single digit is a tone&rsquo;s number in the list below, not
              its pitch.
            </>
          )}
        </P>
        <P>
          {L(
            "Where a contributor has added it, an entry also carries the pronunciation in the International Phonetic Alphabet.",
            "如果投稿者有提供，詞條也會附上以國際音標標注的讀音。",
          )}
        </P>
      </Block>

      <Block>
        <H>{L("Bàng-uâ-cê and Yngping side by side", "平話字與榕拼對照")}</H>
        <P>
          {L(
            "The seven tones, each with its number in Yngping and a word from this dictionary in both systems. The number 6 is skipped: Yngping numbers the tones in the traditional eight-tone order, and Fuzhou speech has no separate sixth.",
            "七個聲調，各附榕拼的編號，以及本辭典裡的一個詞的兩種寫法。編號跳過 6：榕拼按傳統八音的順序編號，而福州話沒有獨立的第六調。",
          )}
        </P>
        <Table
          head={[L("Tone", "聲調"), L("Pitch", "音高"), L("Yngping", "榕拼"), L("Example", "例詞")]}
          widths={["22%", "13%", "13%", "52%"]}
          rows={[
            [<Han key="t">陰平</Han>, "44", "1", <><Han>心</Han> <Rom>sĭng</Rom> · <Rom>sing1</Rom>{L(", heart", "")}</>],
            [<Han key="t">上聲</Han>, "31", "2", <><Han>酒</Han> <Rom>ciū</Rom> · <Rom>ziu2</Rom>{L(", wine", "")}</>],
            [<Han key="t">陰去</Han>, "213", "3", <><Han>菜</Han> <Rom>chái</Rom> · <Rom>cai3</Rom>{L(", vegetable", "（蔬菜）")}</>],
            [<Han key="t">陰入</Han>, "23", "4", <><Han>八</Han> <Rom>báik</Rom> · <Rom>bek4</Rom>{L(", eight", "")}</>],
            [<Han key="t">陽平</Han>, "53", "5", <><Han>魚</Han> <Rom>ngṳ̀</Rom> · <Rom>ngy5</Rom>{L(", fish", "")}</>],
            [<Han key="t">陽去</Han>, "242", "7", <><Han>地</Han> <Rom>dê</Rom> · <Rom>di7</Rom>{L(", ground", "（地面）")}</>],
            [<Han key="t">陽入</Han>, "5", "8", <><Han>讀</Han> <Rom>tĕ̤k</Rom> · <Rom>toek8</Rom>{L(", to read", "")}</>],
          ]}
        />
        <p className="text-sm text-inkFaint">
          {zh ? (
            <>
              榕拼拼寫是用{" "}
              <a href="https://github.com/zingzeu/yngdieng" target="_blank" rel="noreferrer" className="hover:text-lacquer hover:underline">
                榕典
              </a>{" "}
              專案的對照表（MIT 授權）從平話字換算的，並採用較新榕拼的 <Rom>oe</Rom> 拼法。和平話字一樣，它標的是每個音節單念時的聲調，不是在詞裡變調後的聲調。
            </>
          ) : (
            <>
              Yngping spellings are converted from Bàng-uâ-cê with the tables of the{" "}
              <a href="https://github.com/zingzeu/yngdieng" target="_blank" rel="noreferrer" className="hover:text-lacquer hover:underline">
                榕典
              </a>{" "}
              project (MIT licence), with the <Rom>oe</Rom> spelling of newer Yngping. Like Bàng-uâ-cê, they
              give each syllable its tone said alone, not the tone it takes inside a longer word.
            </>
          )}
        </p>
      </Block>

      <Block>
        <H>{L("The Bàng-uâ-cê alphabet", "平話字字母表")}</H>
        <P>
          {zh ? (
            <>
              每個字母都列出它的國際音標、最接近的英文發音，以及本辭典裡用到它的一個詞。元音上方的聲調符號是另一回事，請看「特點」分頁裡的「
              <a href="#tones" className="text-lacquer hover:underline">
                聲調
              </a>
              」一節。
            </>
          ) : (
            <>
              Every letter, with its sound in the International Phonetic Alphabet, the nearest English
              sound, and a word from this dictionary that uses it. The tone marks above the vowels are a
              separate matter, covered under{" "}
              <a href="#tones" className="text-lacquer hover:underline">
                Tones
              </a>{" "}
              in the Features panel.
            </>
          )}
        </P>
        {/* Example glosses: in Chinese a gloss is given only where the
            Mandarin reading of the character would not already say it. */}
        <Table
          head={[L("Consonants", "輔音"), IPA, LIKE, EX]}
          widths={ALPHABET_COLS}
          rows={[
            [<Rom>b</Rom>, "p", L("p in spin (no puff of air)", "英文 spin 的 p（不送氣）"), <><Han>八</Han> <Rom>báik</Rom>{L(", eight", "")}</>],
            [<Rom>p</Rom>, "pʰ", L("p in pin (with the puff)", "英文 pin 的 p（送氣）"), <><Han>鼻</Han> <Rom>pĭ</Rom>{L(", nose", "，鼻子")}</>],
            [<Rom>m</Rom>, "m", L("m in man", "英文 man 的 m"), <><Han>米</Han> <Rom>mī</Rom>{L(", rice", "")}</>],
            [<Rom>d</Rom>, "t", L("t in stop (no puff of air)", "英文 stop 的 t（不送氣）"), <><Han>地</Han> <Rom>dê</Rom>{L(", ground", "，地面")}</>],
            [<Rom>t</Rom>, "tʰ", L("t in top (with the puff)", "英文 top 的 t（送氣）"), <><Han>天</Han> <Rom>tiĕng</Rom>{L(", sky", "，天空")}</>],
            [<Rom>n</Rom>, "n", L("n in no", "英文 no 的 n"), <><Han>年</Han> <Rom>niòng</Rom>{L(", year", "")}</>],
            [<Rom>l</Rom>, "l", L("l in low", "英文 low 的 l"), <><Han>冷</Han> <Rom>lēng</Rom>{L(", cold", "")}</>],
            [<Rom>g</Rom>, "k", L("k in skin (no puff of air)", "英文 skin 的 k（不送氣）"), <><Han>狗</Han> <Rom>gāu</Rom>{L(", dog", "")}</>],
            [<Rom>k</Rom>, "kʰ", L("k in kin (with the puff)", "英文 kin 的 k（送氣）"), <><Han>看</Han> <Rom>káng</Rom>{L(", to look", "")}</>],
            [<Rom>ng</Rom>, "ŋ", L("ng in sing, but starting a syllable", "英文 sing 的 ng，但放在音節開頭"), <><Han>魚</Han> <Rom>ngṳ̀</Rom>{L(", fish", "")}</>],
            [<Rom>h</Rom>, "h", L("h in hat", "英文 hat 的 h"), <><Han>海</Han> <Rom>hāi</Rom>{L(", sea", "")}</>],
            [<Rom>c</Rom>, "ts", L("ts in cats (no puff of air)", "英文 cats 的 ts（不送氣）"), <><Han>酒</Han> <Rom>ciū</Rom>{L(", wine", "")}</>],
            [<Rom>ch</Rom>, "tsʰ", L("ts in cats, with a puff of air", "英文 cats 的 ts，但送氣"), <><Han>菜</Han> <Rom>chái</Rom>{L(", vegetable", "，蔬菜")}</>],
            [<Rom>s</Rom>, "s", L("s in see", "英文 see 的 s"), <><Han>山</Han> <Rom>săng</Rom>{L(", mountain", "")}</>],
          ]}
        />
        {/* A gap before each table after the first, so consonants, vowels and
            endings read as three charts rather than one long one. Each chart's
            footnote sits tight under it, in the same small grey type. */}
        <div className="!mt-10 space-y-3">
        <Table
          head={[L("Vowels", "元音"), IPA, LIKE, EX]}
          widths={ALPHABET_COLS}
          rows={[
            [<Rom>a</Rom>, "a", L("a in father", "英文 father 的 a"), <><Han>花</Han> <Rom>huă</Rom>{L(", flower", "")}</>],
            [<Rom>a̤</Rom>, "ɛ", L("e in bed", "英文 bed 的 e"), <><Han>洗</Han> <Rom>sā̤</Rom>{L(", to wash", "")}</>],
            [<Rom>e̤</Rom>, "ø", L("eh with the lips rounded, as in French peu", "圓唇的 eh，像法文 peu"), <><Han>讀</Han> <Rom>tĕ̤k</Rom>{L(", to read", "")}</>],
            [<Rom>i</Rom>, "i", L("ee in see", "英文 see 的 ee"), <><Han>鼻</Han> <Rom>pĭ</Rom>{L(", nose", "，鼻子")}</>],
            [<Rom>o̤</Rom>, "ɔ", L("aw in law", "英文 law 的 aw"), <><Han>做</Han> <Rom>có̤</Rom>{L(", to do", "")}</>],
            [<Rom>u</Rom>, "u", L("oo in food", "英文 food 的 oo"), <><Han>烏</Han> <Rom>ŭ</Rom>{L(", black", "，黑")}</>],
            [<Rom>ṳ</Rom>, "y", L("ee with the lips rounded, as in French tu", "圓唇的 ee，像法文 tu"), <><Han>雨</Han> <Rom>ṳ̄</Rom>{L(", rain", "")}</>],
          ]}
        />
        <p className="text-sm text-inkFaint">
          {zh ? (
            <>
              元音可以互相組合：<Rom>ia</Rom>、<Rom>ua</Rom>、<Rom>ie</Rom>、<Rom>uo</Rom>、<Rom>io</Rom>、
              <Rom>ai</Rom>、<Rom>au</Rom>、<Rom>iu</Rom>、<Rom>ui</Rom>、<Rom>eu</Rom>{" "}
              等等，唸法就是把各個字母依序連起來：<Han>天</Han> <Rom>tiĕng</Rom>、<Han>花</Han>{" "}
              <Rom>huă</Rom>、<Han>狗</Han> <Rom>gāu</Rom>、<Han>手</Han> <Rom>chiū</Rom>。
            </>
          ) : (
            <>
              The vowels combine: <Rom>ia</Rom>, <Rom>ua</Rom>, <Rom>ie</Rom>, <Rom>uo</Rom>, <Rom>io</Rom>,{" "}
              <Rom>ai</Rom>, <Rom>au</Rom>, <Rom>iu</Rom>, <Rom>ui</Rom>, <Rom>eu</Rom> and so on, each said
              as its letters in sequence: <Han>天</Han> <Rom>tiĕng</Rom>, <Han>花</Han> <Rom>huă</Rom>,{" "}
              <Han>狗</Han> <Rom>gāu</Rom>, <Han>手</Han> <Rom>chiū</Rom>.
            </>
          )}
        </p>
        </div>
        <div className="!mt-10 space-y-3">
        <Table
          head={[L("Endings", "韻尾"), IPA, LIKE, EX]}
          widths={ALPHABET_COLS}
          rows={[
            [<Rom>-ng</Rom>, "ŋ", L("ng in sing", "英文 sing 的 ng"), <><Han>心</Han> <Rom>sĭng</Rom>{L(", heart", "")}</>],
            [<Rom>-h</Rom>, "ʔ", L("the catch in “uh-oh”; the syllable stops short", "英文 “uh-oh” 中間那一下頓住；音節戛然而止"), <><Han>白</Han> <Rom>băh</Rom>{L(", white", "")}</>],
            [<Rom>-k</Rom>, "ʔ", L("the same catch; spelt k because it once was one", "同樣的頓住；拼作 k，是因為它從前確實是 k"), <><Han>十</Han> <Rom>sĕk</Rom>{L(", ten", "")}</>],
          ]}
        />
        <p className="text-sm text-inkFaint">
          {zh ? (
            <>
              發音依據維基百科上的平話字表格，列在「參考資料」中。有些人把 <Rom>a̤</Rom> 唸得比較接近{" "}
              <i>bed</i> 的 <i>e</i>，把 <Rom>o̤</Rom> 唸得比較接近 <i>o</i>；表中列的是這套拼寫當初所依據的傳統音值。
            </>
          ) : (
            <>
              Sounds after the Bàng-uâ-cê tables on Wikipedia, listed under Sources. Some speakers
              say <Rom>a̤</Rom> closer to <i>e</i> in <i>bed</i>, and <Rom>o̤</Rom> closer to <i>o</i>; the
              values given are the traditional ones the spelling was built on.
            </>
          )}
        </p>
        </div>
      </Block>
    </>
  );
}

/* ------------------------------------------------------------------------ */

/* title stays as published; titleZh, where given, is a Chinese gloss shown
   after it in the zh view. */
const READING: { href: string; title: string; titleZh?: string; note: string; noteZh: string }[] = [
  {
    href: "https://en.wikisource.org/wiki/Dictionary_of_the_Foochow_Dialect",
    title: "Dictionary of the Foochow Dialect (Maclay, Baldwin & Leger, 3rd ed., 1929)",
    note: "the missionary dictionary that fixed Bàng-uâ-cê; public domain. It records Fuzhou speech as heard a century ago, and some sounds have shifted since, so the recordings here are the better guide to how a word is said today",
    noteZh: "奠定平話字的傳教士辭典，屬公有領域。它記錄的是一百年前的福州話，有些音此後已經改變，所以一個詞今天怎麼說，本站的錄音是更好的參考",
  },
  {
    href: "https://en.wiktionary.org/",
    title: "Wiktionary",
    titleZh: "維基詞典",
    note: "thousands of words with Fuzhou readings in Bàng-uâ-cê and IPA, CC BY-SA. Many entries in this dictionary were imported from here and say so in their notes",
    noteZh: "收錄數千個附平話字與國際音標福州讀音的詞，採 CC BY-SA 授權。本辭典有許多詞條是從這裡匯入的，並在附註中註明",
  },
  {
    href: "https://github.com/zingzeu/yngdieng",
    title: "榕典 Yngdieng",
    note: "an online Fuzhounese dictionary and the home of Yngping. Its tables (MIT licence) are what this site uses to show words in Yngping",
    noteZh: "線上福州話辭典，也是榕拼的家。本站用它的對照表（MIT 授權）把詞轉成榕拼顯示",
  },
  { href: "https://www.fulingo.com/", title: "Fulingo", note: "Duolingo-style Fuzhounese lessons with native audio", noteZh: "類似 Duolingo 的福州話課程，附母語者錄音" },
  { href: "https://seedict.com/", title: "Seedict", note: "Fuzhounese word list", noteZh: "福州話詞表" },
  { href: "https://en.wiktionary.org/wiki/Fuzhounese", title: "Wiktionary: Fuzhounese", titleZh: "維基詞典：福州話", note: "Dictionary entry for Fuzhounese", noteZh: "「福州話」的詞典條目" },
  { href: "https://en.wikipedia.org/wiki/Fuzhou_dialect", title: "Wikipedia: Fuzhou dialect", titleZh: "維基百科：福州話", note: "Sounds, tones, sandhi and grammar", noteZh: "語音、聲調、變調與語法" },
  { href: "https://en.wikipedia.org/wiki/B%C3%A0ng-u%C3%A2-c%C3%AA", title: "Wikipedia: Bàng-uâ-cê", titleZh: "維基百科：平話字", note: "The background and rules for a popular romanization method", noteZh: "一套通行羅馬字方案的背景與規則" },
  { href: "https://cdo.wikipedia.org/", title: "Mìng-dĕ̤ng-ngṳ̄ Wikipedia", titleZh: "閩東語維基百科", note: "A Wiki written in Bàng-uâ-cê", noteZh: "用平話字寫成的維基百科" },
];

function reading(lang: Lang) {
  const L = pick(lang);
  const zh = lang === "zh";
  return (
    <>
      <P>{L("Other places to learn, look things up, or read the language.", "其他可以學習、查詢或閱讀福州話的地方。")}</P>
      <ul className="space-y-3">
        {READING.map((r) => {
          const note = zh ? r.noteZh : r.note;
          return (
            <li key={r.href} className="leading-relaxed">
              <a
                href={r.href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-lacquer hover:underline"
              >
                {zh && r.titleZh ? `${r.title}（${r.titleZh}）` : r.title}
              </a>
              <span className="block text-sm text-inkFaint">
                {note.charAt(0).toUpperCase() + note.slice(1)}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** The three panels, built for one language. */
export function buildLearnPanels(lang: Lang): Panel[] {
  const L = pick(lang);
  return [
    { key: "features", label: L("Features", "特點"), body: features(lang) },
    { key: "orthography", label: L("Orthography", "拼寫"), body: orthography(lang) },
    { key: "reading", label: L("Sources", "參考資料"), body: reading(lang) },
  ];
}

/* The English panels, for code that reads them as text rather than showing
   them (the assistant's grounding in src/lib/assistant.ts). */
export const learnPanels: Panel[] = buildLearnPanels("en");

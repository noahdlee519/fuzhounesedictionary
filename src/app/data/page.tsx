import type { Metadata } from "next";
import Link from "next/link";
import { Section, Ul, LEGAL_CONTACT } from "@/components/Legal";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

export function generateMetadata(): Metadata {
  const L = pick(getLang());
  return {
    title: L("Open data", "開放資料"),
    description: L(
      "Every published word and recording on fuzhounese.org as feeds, for dictionaries and language projects to use under CC BY-SA 4.0.",
      "fuzhounese.org 上所有已刊出的詞條與錄音，以資料源提供，供辭典與語言計畫依 CC BY-SA 4.0 使用。",
    ),
    alternates: { canonical: "/data" },
  };
}

/* How to use the open-data feeds (src/app/api/export/recordings and
   …/words). Written for the developer on a partner project — SeeDict
   first — who will set up the sync. */

const A = "text-lacquer hover:underline";
const FEEDS = {
  recordings: "https://fuzhounese.org/api/export/recordings",
  words: "https://fuzhounese.org/api/export/words",
};
const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[0.9em] text-ink">{children}</code>
);

export default function DataPage() {
  const lang = getLang();
  const L = pick(lang);
  return (
    <article className="space-y-10">
      <section className="border-b border-rule pb-6">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {L("Open data", "開放資料")}
        </h1>
      </section>

      <div className="max-w-[68ch] space-y-8">
        <Section n={1} title={L("The feeds", "資料源")}>
          <Ul>
            <li>
              {L("Recordings: ", "錄音：")}
              <a href={FEEDS.recordings} className={`${A} break-all`}>{FEEDS.recordings}</a>
            </li>
            <li>
              {L("Words, with all their meanings: ", "詞條及其所有意思：")}
              <a href={FEEDS.words} className={`${A} break-all`}>{FEEDS.words}</a>
            </li>
          </Ul>
          <p>
            {L("Both are JSON. Add ", "兩者都是 JSON。在網址後加上 ")}
            <Code>?format=csv</Code>
            {L(
              " for a spreadsheet instead (the words file has one row per meaning). Each response is the complete current list, refreshed at most once an hour. A recording appears once an editor has listened to it. Each word lists the ids of its recordings, so the two feeds join on recording id.",
              " 即可改為試算表格式（詞條檔每個意思一列）。每次回傳的都是目前的完整清單，最多每小時更新一次。錄音經編輯聽過後才會出現在清單裡。每個詞條都列出它的錄音 id，兩個資料源可以用錄音 id 對應。",
            )}
          </p>
        </Section>

        <Section n={2} title={L("What each recording holds", "每筆錄音的內容")}>
          <Ul>
            <li><Code>id</Code>, <Code>kind</Code> {L("(the word itself, or an example sentence), ", "（詞本身或例句）、")}<Code>audio_url</Code>, <Code>format</Code>, <Code>seconds</Code></li>
            <li>
              <Code>word</Code>
              {L(
                ": the characters, the romanization as the dictionary writes it (Bàng-uâ-cê), the same in Yngping 榕拼 where it converts, the first English meaning and Mandarin gloss, and a link to the word's page",
                "：漢字、辭典使用的羅馬字（平話字）、可轉換時的榕拼、第一個英文意思與華語釋義，以及詞條頁連結",
              )}
            </li>
            <li>
              <Code>sentence</Code>
              {L(
                ": for an example recording, the sentence read and its English. Where the sentence was never written down, the English is the speaker's own note on the take (",
                "：例句錄音所念的句子及其英文。句子本身沒有寫下來的，英文取自講者對錄音的附註（",
              )}
              <Code>translation_from</Code>: <Code>speaker_note</Code>
              {L(")", "）")}
            </li>
            <li>
              <Code>speaker</Code>, <Code>recorded_by</Code>, <Code>origin</Code>
              {L(
                ": who is speaking (when it is not the account holder), the account that recorded it, and where the speaker's Fuzhounese is from",
                "：講者（如果不是帳號本人）、錄音的帳號，以及講者的福州話來自哪裡",
              )}
            </li>
            <li><Code>attribution</Code>{L(": a ready-made credit line", "：現成的署名文字")}</li>
            <li><Code>published_at</Code>, <Code>checked_at</Code></li>
            <li>
              <Code>tts_ready</Code>, <Code>flags</Code>
              {L(
                ": whether the audio comes with a written form of exactly what is said, and if not, why",
                "：錄音是否附有所說內容的完整文字；若沒有，原因為何",
              )}
            </li>
          </Ul>
          <p>
            {L(
              "For text-to-speech or any work that pairs audio with text, use only recordings with tts_ready true. The others are still good recordings of the language, but the words in them have not been written down yet: ",
              "做語音合成或任何需要把聲音和文字配對的工作，請只用 tts_ready 為 true 的錄音。其他錄音仍是很好的語料，只是內容還沒有寫成文字：",
            )}
            <Code>sentence_not_transcribed</Code>
            {L(" (an example sentence with no text), ", "（例句沒有文字）、")}
            <Code>no_romanization</Code>
            {L(" (the word has no pronunciation written), ", "（詞沒有標音）、")}
            <Code>romanization_not_standard</Code>
            {L(" (written in a system that does not convert to Yngping), or ", "（標音系統無法轉成榕拼），或 ")}
            <Code>longer_than_word</Code>
            {L(
              " (a word recording over 8 seconds: the speaker says the word, then uses it in a sentence). As the words are written down, the first three turn true in the feed by themselves.",
              "（超過 8 秒的詞錄音：講者先說這個詞，再用它造一個句子）。前三種補上文字之後，資料源裡會自動變成 true。",
            )}
          </p>
        </Section>

        <Section n={3} title={L("What each word holds", "每個詞條的內容")}>
          <Ul>
            <li>
              <Code>id</Code>, <Code>url</Code>, <Code>hanzi</Code>, <Code>romanization</Code>, <Code>yngping</Code>, <Code>ipa</Code>
              {L(": the word as the dictionary writes it, in Bàng-uâ-cê and in Yngping 榕拼 where it converts", "：辭典所寫的詞，平話字以及可轉換時的榕拼")}
            </li>
            <li>
              <Code>meanings</Code>
              {L(
                ": each meaning in order, with its part of speech, English, Mandarin gloss and example sentence. Vulgar and sexual meanings are included and marked ",
                "：依序列出每個意思，附詞性、英文、華語釋義與例句。粗俗或涉及性的意思也收錄，並標為 ",
              )}
              <Code>explicit</Code>
              {L("; the site hides those from its lists by default", "；本站預設不在清單中顯示這些意思")}
            </li>
            <li>
              <Code>origin</Code>, <Code>added_by</Code>
              {L(": where the word's Fuzhounese is from, and the account that added it", "：這個詞的福州話來自哪裡，以及新增它的帳號")}
            </li>
            <li>
              <Code>source</Code>
              {L(
                ": for a word imported from a published dictionary (most often Wiktionary), where it came from",
                "：從已出版辭典（多為維基詞典）匯入的詞，其出處",
              )}
            </li>
            <li><Code>notes</Code>, <Code>recording_ids</Code>, <Code>created_at</Code>, <Code>updated_at</Code></li>
          </Ul>
        </Section>

        <Section n={4} title={L("Licence and credit", "授權與署名")}>
          <p>
            {L("The words and recordings are licensed ", "詞條與錄音採用 ")}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className={A}>
              CC BY-SA 4.0
            </a>
            {L(
              ". Wherever they are used, credit fuzhounese.org — for a recording, the speaker too (the attribution field is written for that), and for an imported word, its source — and share anything you make from them under the same licence. Each contributor agreed to this licence when they contributed (",
              " 授權。凡使用之處，請註明 fuzhounese.org；錄音也請註明講者（attribution 欄位就是為此而寫），匯入的詞條也請註明出處；並以相同授權分享以此製作的內容。每位貢獻者貢獻時都同意了這項授權（見",
            )}
            <Link href="/terms" className={A}>{L("terms", "服務條款")}</Link>
            {L(").", "）。")}
          </p>
        </Section>

        <Section n={5} title={L("Contact", "聯絡")}>
          <p>
            {L("Using the feeds, or need something they do not have? Write to ", "正在使用資料源，或需要其中沒有的內容？請寫信至 ")}
            <a href={`mailto:${LEGAL_CONTACT}`} className={A}>{LEGAL_CONTACT}</a>
            {L(".", "。")}
          </p>
        </Section>
      </div>
    </article>
  );
}

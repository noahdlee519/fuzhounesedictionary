import type { Metadata } from "next";
import Link from "next/link";
import { Section, Ul, LEGAL_CONTACT } from "@/components/Legal";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

export function generateMetadata(): Metadata {
  const L = pick(getLang());
  return {
    title: L("Open data: recordings", "開放資料：錄音"),
    description: L(
      "Every published recording on fuzhounese.org as a feed, for dictionaries and language projects to use under CC BY-SA 4.0.",
      "fuzhounese.org 上所有已刊出的錄音，以資料源提供，供辭典與語言計畫依 CC BY-SA 4.0 使用。",
    ),
    alternates: { canonical: "/data" },
  };
}

/* How to use the recordings feed (src/app/api/export/recordings). Written
   for the developer on a partner project — SeeDict first — who will set up
   the daily sync. */

const A = "text-lacquer hover:underline";
const JSON_URL = "https://fuzhounese.org/api/export/recordings";
const CSV_URL = "https://fuzhounese.org/api/export/recordings?format=csv";
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
          {L("Open data: recordings", "開放資料：錄音")}
        </h1>
      </section>

      <div className="max-w-[68ch] space-y-8">
        <Section n={1} title={L("The feed", "資料源")}>
          <Ul>
            <li>
              JSON: <a href={JSON_URL} className={`${A} break-all`}>{JSON_URL}</a>
            </li>
            <li>
              {L("CSV, for a spreadsheet: ", "CSV（可用試算表開啟）：")}
              <a href={CSV_URL} className={`${A} break-all`}>{CSV_URL}</a>
            </li>
          </Ul>
          <p>
            {L(
              "Each response is the complete current list of published recordings, refreshed at most once an hour. A recording appears once an editor has listened to it.",
              "每次回傳的都是目前所有已刊出錄音的完整清單，最多每小時更新一次。錄音經編輯聽過後才會出現在清單裡。",
            )}
          </p>
        </Section>

        <Section n={2} title={L("What each record holds", "每筆資料的內容")}>
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

        <Section n={3} title={L("Licence and credit", "授權與署名")}>
          <p>
            {L("The recordings are licensed ", "錄音採用 ")}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className={A}>
              CC BY-SA 4.0
            </a>
            {L(
              ". Wherever a recording is played or published, credit the speaker and fuzhounese.org — the attribution field is written for that — and share anything you make from them under the same licence. Each contributor agreed to this licence when they recorded (",
              " 授權。凡播放或發布錄音之處，請註明講者與 fuzhounese.org（attribution 欄位就是為此而寫），並以相同授權分享以此製作的內容。每位貢獻者錄音時都同意了這項授權（見",
            )}
            <Link href="/terms" className={A}>{L("terms", "服務條款")}</Link>
            {L(").", "）。")}
          </p>
        </Section>

        <Section n={4} title={L("Contact", "聯絡")}>
          <p>
            {L("Using the feed, or need something it does not have? Write to ", "正在使用資料源，或需要它沒有的內容？請寫信至 ")}
            <a href={`mailto:${LEGAL_CONTACT}`} className={A}>{LEGAL_CONTACT}</a>
            {L(".", "。")}
          </p>
        </Section>
      </div>
    </article>
  );
}

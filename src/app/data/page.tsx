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
        <div className="mt-5 max-w-[68ch] space-y-3 text-lg leading-relaxed text-inkSoft">
          <p>
            {L(
              "Every recording published on fuzhounese.org is available as a feed, so that other dictionaries and language projects can use it. It is how ",
              "fuzhounese.org 上刊出的每一段錄音都以資料源提供，讓其他辭典和語言計畫也能使用。",
            )}
            <a href="https://seedict.com/" target="_blank" rel="noreferrer" className={A}>
              {L("SeeDict (米时典)", "米时典（SeeDict）")}
            </a>
            {L(" keeps its copy up to date. It is free, needs no key, and the recordings are licensed CC BY-SA 4.0.", "就是用它保持資料同步。資料源免費、不需金鑰，錄音採 CC BY-SA 4.0 授權。")}
          </p>
        </div>
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

        <Section n={2} title={L("Keeping a copy in sync", "保持同步")}>
          <p>{L("Once a day is plenty. Each time:", "每天一次就足夠。每次：")}</p>
          <Ul>
            <li>{L("download the audio for every id you do not have yet, from its ", "對尚未擁有的每個 id，從它的 ")}<Code>audio_url</Code>{L(";", " 下載音檔；")}</li>
            <li>{L("update the details of the ones you have (a note or a credit can change);", "更新已有錄音的資料（附註或署名可能會改）；")}</li>
            <li>
              <strong className="font-semibold text-ink">{L("remove every recording that is no longer in the list.", "刪除清單裡已經沒有的錄音。")}</strong>{" "}
              {L(
                "Takes are sometimes withdrawn, and contributors may ask to have their voice taken down; the list is the record of what may still be used.",
                "錄音有時會被撤回，貢獻者也可以要求移除自己的聲音；這份清單就是仍可使用的錄音的依據。",
              )}
            </li>
          </Ul>
          <p>
            {L(
              "The audio files are WebM (Opus), as phones and browsers record them; convert them if your player needs MP3 or AAC. The files are stored in the United States and can be slow to reach from mainland China, so keep your own copies rather than linking to ours.",
              "音檔是手機和瀏覽器錄下的 WebM（Opus）格式；若播放器需要 MP3 或 AAC，請自行轉檔。音檔存放在美國，從中國大陸存取可能較慢，請自行保存副本，不要直接連結到我們的檔案。",
            )}
          </p>
        </Section>

        <Section n={3} title={L("What each record holds", "每筆資料的內容")}>
          <Ul>
            <li><Code>id</Code>, <Code>kind</Code> {L("(the word itself, or an example sentence), ", "（詞本身或例句）、")}<Code>audio_url</Code>, <Code>format</Code>, <Code>seconds</Code></li>
            <li>
              <Code>word</Code>
              {L(
                ": the characters, the romanization as the dictionary writes it (Bàng-uâ-cê), the same in Yngping 榕拼 where it converts, the first English meaning and Mandarin gloss, and a link to the word's page",
                "：漢字、辭典使用的羅馬字（平話字）、可轉換時的榕拼、第一個英文意思與華語釋義，以及詞條頁連結",
              )}
            </li>
            <li><Code>sentence</Code>{L(": for an example recording, the sentence read and its translation", "：例句錄音所念的句子及其翻譯")}</li>
            <li>
              <Code>speaker</Code>, <Code>recorded_by</Code>, <Code>origin</Code>
              {L(
                ": who is speaking (when it is not the account holder), the account that recorded it, and where the speaker's Fuzhounese is from",
                "：講者（如果不是帳號本人）、錄音的帳號，以及講者的福州話來自哪裡",
              )}
            </li>
            <li><Code>attribution</Code>{L(": a ready-made credit line", "：現成的署名文字")}</li>
            <li><Code>published_at</Code>, <Code>checked_at</Code></li>
          </Ul>
        </Section>

        <Section n={4} title={L("Licence and credit", "授權與署名")}>
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

        <Section n={5} title={L("Contact", "聯絡")}>
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

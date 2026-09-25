import type { Metadata } from "next";
import { recordingsTrusted } from "@/lib/trust";
import Link from "next/link";
import { LegalPage, Section, Ul, LEGAL_CONTACT } from "@/components/Legal";
import { SITE_NAME } from "@/lib/site";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

export function generateMetadata(): Metadata {
  const L = pick(getLang());
  return {
    title: L("Terms of service", "服務條款"),
    description: L(
      "The rules for using and contributing to the {site}.",
      "使用{site}及參與貢獻的規則。",
      { site: SITE_NAME },
    ),
    alternates: { canonical: "/terms" },
  };
}

/* The English text is authoritative; the Chinese is a courtesy translation
   (LegalPage says so at the top when the language is zh). Change both. */
const UPDATED = { en: "3 September 2026", zh: "2026年9月3日" };

/* Governing law: the state the site is run from. Keep the two in step. */
const GOVERNING_STATE = { en: "New York", zh: "紐約州" };

const A = "text-lacquer hover:underline";

export default function TermsPage() {
  const lang = getLang();
  const L = pick(lang);
  const zh = lang === "zh";
  const trusted = recordingsTrusted();
  return (
    <LegalPage
      lang={lang}
      other="privacy"
      title={L("Terms of service", "服務條款")}
      updated={UPDATED[lang]}
      intro={
        <>
          <p>
            {L(
              "These are the rules for using fuzhounese.org. Reading the dictionary needs no account and no agreement beyond the licence on the content. Signing in and contributing means you accept everything below. They are short on purpose; please read them.",
              "以下是使用 fuzhounese.org 的規則。閱讀辭典不需要帳號，除了內容的授權條款之外，也不需要同意任何協議。登入並參與貢獻，即表示你接受以下所有條款。這些條款刻意寫得簡短；請務必閱讀。",
            )}
          </p>
          <p>
            {L(
              "The site is run by Noah Lee (“we”), a private individual in the United States, not a company. Contact: ",
              "本網站由 Noah Lee（以下稱「我們」）經營，他是身在美國的個人，而非公司。聯絡方式：",
            )}
            <a href={`mailto:${LEGAL_CONTACT}`} className={A}>{LEGAL_CONTACT}</a>
            {L(".", "。")}
          </p>
        </>
      }
    >
      <Section n={1} title={L("Using the dictionary", "使用辭典")}>
        {zh ? (
          <p>
            這裡發布的所有內容——詞、釋義、例句、發音、附註和錄音——都以
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className={A}>
              創用 CC 姓名標示-相同方式分享 4.0
            </a>
            授權。你可以複製、分享、改作並以其為基礎進行創作，包括用於商業目的，前提是你須註明 fuzhounese.org
            以及貢獻者（如有具名），並以相同的授權條款釋出你以其為基礎所創作的任何內容。本網站的設計、程式碼和名稱不在該授權範圍內。
          </p>
        ) : (
          <p>
            Everything published here—words, meanings, examples, pronunciations, notes and
            recordings—is licensed under{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className={A}>
              Creative Commons Attribution-ShareAlike 4.0
            </a>
            . You may copy, share, adapt and build on it, including commercially, provided you credit
            fuzhounese.org and the contributor where one is named, and release anything you build on it
            under the same licence. The site&apos;s design, code and name are not covered by that licence.
          </p>
        )}
        <p>
          {L(
            "Do not do anything that gets in the way of other people using the site: no attacks, no scraping at a rate that harms the service, no attempts to get around the review process or the limits on submissions.",
            "請勿做任何妨礙他人使用本網站的事：不得發動攻擊，不得以損害服務的頻率抓取資料，不得試圖規避審核流程或提交數量的限制。",
          )}
        </p>
      </Section>

      <Section n={2} title={L("Accounts", "帳號")}>
        <p>
          {L(
            "You need a Google account to sign in, and you must be at least 13 years old. Your account is yours: do not share it, and tell us if you think someone else has used it. We may suspend or close an account that breaks these terms, and we may close inactive or abandoned accounts. You can ask us to delete yours at any time; the ",
            "你需要一個 Google 帳號才能登入，而且必須年滿 13 歲。你的帳號屬於你自己：請勿與他人共用；如果你認為有其他人使用過你的帳號，請告訴我們。我們可以停用或關閉違反本條款的帳號，也可以關閉不活躍或已被棄置的帳號。你隨時可以要求我們刪除你的帳號；",
          )}
          <Link href="/privacy" className={A}>{L("privacy policy", "《隱私權政策》")}</Link>
          {L(" says what happens then.", "說明了屆時會如何處理。")}
        </p>
      </Section>

      <Section n={3} title={L("Contributing", "貢獻")}>
        <p>
          {L(
            "When you add a word, a meaning, an example, a pronunciation, a note or a recording, you promise that:",
            "當你新增一個詞、釋義、例句、發音、附註或錄音時，你保證：",
          )}
        </p>
        <Ul>
          <li>
            {L(
              "it is your own work, or something you have the right to share—in particular, you have not copied definitions or example sentences from a published dictionary or other copyrighted source;",
              "它是你自己的作品，或是你有權分享的內容——特別是，你沒有從已出版的辭典或其他受著作權保護的來源抄襲釋義或例句；",
            )}
          </li>
          <li>
            {L(
              "a recording is of your own voice, or of someone who has agreed to be recorded and published under these terms;",
              "錄音是你自己的聲音，或是已同意依本條款被錄音並發布的人的聲音；",
            )}
          </li>
          <li>
            {L(
              "it is offered in good faith as an honest record of how Fuzhounese is spoken.",
              "它是出於善意提供的，是福州話實際講法的如實紀錄。",
            )}
          </li>
        </Ul>
        <p>
          {L(
            "By contributing you license your contribution to us and to everyone else under CC BY-SA 4.0, irrevocably. You keep the copyright. You agree to be credited by the display name on your profile, and you agree that we may edit, shorten, correct, merge or reject your contribution, and remove it at any time.",
            "你一經貢獻，即以 CC BY-SA 4.0 將你的貢獻不可撤銷地授權給我們及其他所有人。著作權仍歸你所有。你同意以個人檔案上的顯示名稱署名，並同意我們可以編輯、刪節、更正、合併或退回你的貢獻，也可以隨時將其移除。",
          )}
        </p>
        <p>
          {trusted
            ? L(
                "Words, meanings and edits appear on the site only once an editor has approved them. Recordings appear as soon as they are saved, and an editor checks them afterwards. ",
                "詞、釋義和修改須經編輯核准後才會出現在網站上。錄音一經儲存就會出現，之後由編輯檢查。",
              )
            : L(
                "Nothing appears on the site until an editor has approved it. ",
                "任何內容都須經編輯核准後才會出現在網站上。",
              )}
          {L(
            "We can decline or take down anything, for any reason, and we do not owe an explanation, though we usually give one.",
            "我們可以基於任何理由拒絕或撤下任何內容，且沒有義務說明原因，但我們通常會說明。",
          )}
        </p>
      </Section>

      <Section n={4} title={L("What not to submit", "不得提交的內容")}>
        <Ul>
          <li>{L("anything you do not have the right to share (see above);", "任何你無權分享的內容（見上文）；")}</li>
          <li>{L("personal information about other people;", "他人的個人資料；")}</li>
          <li>
            {L(
              "slurs, harassment, or content meant to demean a group of people—with the obvious exception that a dictionary records offensive words as words, labeled as such;",
              "侮辱性稱呼、騷擾，或意在貶低某個群體的內容——但有一個顯而易見的例外：辭典會把冒犯性的詞當作詞收錄，並標明其冒犯性；",
            )}
          </li>
          <li>{L("spam, advertising, or content unrelated to Fuzhounese;", "垃圾訊息、廣告，或與福州話無關的內容；")}</li>
          <li>{L("deliberately false entries.", "故意捏造的詞條。")}</li>
        </Ul>
      </Section>

      <Section n={5} title={L("Reporting and removal", "檢舉與移除")}>
        <p>
          {L(
            "Everything in the dictionary is contributed by its users and checked by a volunteer editor",
            "辭典中的所有內容都由使用者貢獻，並由志願編輯",
          )}
          {trusted
            ? L(
                " (recordings are checked just after they appear rather than before)",
                "檢查（錄音是在出現後隨即檢查，而非事先檢查）",
              )
            : L(" before it appears", "在刊出前檢查")}
          {L(
            ". That check is not a guarantee: an entry, recording or note can still be wrong, offensive, infringing, or about a real person. We do not monitor the site continuously, and we are not responsible for what a contributor submits, but we will act on what we are told about.",
            "。這項檢查並不構成保證：詞條、錄音或附註仍可能有誤、具冒犯性、侵權，或涉及真實人物。我們不會持續監控網站，也不對貢獻者提交的內容負責，但我們會針對收到的通報採取行動。",
          )}
        </p>
        <p>
          {L("If you see something that breaks these terms, email ", "如果你看到違反本條款的內容，請寄信至 ")}
          <a href={`mailto:${LEGAL_CONTACT}`} className={A}>{LEGAL_CONTACT}</a>
          {L(
            " with the address of the page and a sentence about what is wrong, or use the “Report” link at the foot of the entry. We may remove or edit any contribution at any time, with or without notice, for any reason or none, and we will remove content that is unlawful, harassing, infringing, or inappropriate as soon as we reasonably can after it is reported. Repeated or serious breaches can end an account.",
            "，附上該頁的網址並用一句話說明問題所在，或使用詞條底部的「檢舉」連結。我們可以隨時移除或編輯任何貢獻，無論是否事先通知，也無論是否有任何理由；對於違法、騷擾、侵權或不當的內容，我們會在接獲檢舉後，在合理可行的範圍內儘快移除。多次或嚴重違規可能導致帳號被終止。",
          )}
        </p>
      </Section>

      <Section n={6} title={L("Copyright complaints", "著作權申訴")}>
        <p>
          {L("If you believe something on the site infringes your copyright, email ", "如果你認為網站上的某些內容侵犯了你的著作權，請寄信至 ")}
          <a href={`mailto:${LEGAL_CONTACT}`} className={A}>{LEGAL_CONTACT}</a>
          {L(
            " with the address of the page, a description of the work you say is infringed, your contact details, and a statement that you believe in good faith the use is not authorised. We will take the material down while we look into it, and tell the contributor.",
            "，附上該頁的網址、你主張遭侵權之作品的描述、你的聯絡資料，以及一份你善意相信該使用未經授權的聲明。我們會在調查期間撤下該內容，並通知該貢獻者。",
          )}
        </p>
      </Section>

      <Section n={7} title={L("No warranty", "不提供擔保")}>
        <p>
          {L(
            "This is a volunteer project. The dictionary is offered as it is, with no promise that any entry is complete or correct, that the site will always be available, or that it will suit your purpose. Fuzhounese varies from village to village; an entry records what one speaker says, not a standard. Do not rely on the site for anything where an error would matter without checking elsewhere.",
            "這是一個志願計畫。辭典按現狀提供，不保證任何詞條完整或正確，不保證網站隨時可用，也不保證它符合你的用途。福州話各村講法不同；一個詞條記錄的是一位講者的講法，而非標準。凡是一旦出錯就會造成影響的事，請勿未經其他來源查證就依賴本網站。",
          )}
        </p>
      </Section>

      <Section n={8} title={L("Limitation of liability", "責任限制")}>
        <p>
          {L(
            "To the fullest extent the law allows, we are not liable for any loss or damage arising from your use of the site or from anything on it, including other people's contributions. Where liability cannot be excluded, it is limited to the amount you paid to use the site, which is nothing.",
            "在法律允許的最大範圍內，對於因你使用本網站或因網站上的任何內容（包括他人的貢獻）而產生的任何損失或損害，我們概不負責。在責任無法排除的情況下，責任以你為使用本網站所支付的金額為限，而該金額為零。",
          )}
        </p>
      </Section>

      <Section n={9} title={L("Changes and ending", "變更與終止")}>
        <p>
          {L(
            "We may change these terms; the date at the top changes when we do, and a change that matters is announced on the site. Continuing to contribute after a change means you accept it. We may stop running the site at any time. Because the content is openly licensed, anyone may keep a copy and carry it on.",
            "我們可以修改本條款；修改時頁首的日期會隨之更新，重要的變更會在網站上公告。在變更後繼續貢獻，即表示你接受該變更。我們可以隨時停止經營本網站。由於內容採開放授權，任何人都可以保留一份副本並延續下去。",
          )}
        </p>
      </Section>

      <Section n={10} title={L("Law", "準據法")}>
        <p>
          {L(
            "These terms are governed by the laws of the State of {state}, United States, and any dispute will be heard in the courts there. If a court finds part of these terms unenforceable, the rest still applies.",
            "本條款受美國{state}法律管轄，任何爭議均由當地法院審理。如果法院認定本條款的某部分無法執行，其餘部分仍然適用。",
            { state: GOVERNING_STATE[lang] },
          )}
        </p>
      </Section>
    </LegalPage>
  );
}

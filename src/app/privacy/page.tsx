import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Ul, LEGAL_CONTACT } from "@/components/Legal";
import { SITE_NAME } from "@/lib/site";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

export function generateMetadata(): Metadata {
  const L = pick(getLang());
  return {
    title: L("Privacy policy", "隱私權政策"),
    description: L(
      "What the {site} collects, what it shows publicly, and how to have your data removed.",
      "{site}蒐集哪些資料、公開顯示哪些內容，以及如何請我們刪除你的資料。",
      { site: SITE_NAME },
    ),
    alternates: { canonical: "/privacy" },
  };
}

/* The English text is authoritative; the Chinese is a courtesy translation
   (LegalPage says so at the top when the language is zh). Change both. */
const UPDATED = { en: "6 September 2026", zh: "2026年9月6日" };

const A = "text-lacquer hover:underline";

export default function PrivacyPage() {
  const lang = getLang();
  const L = pick(lang);
  const zh = lang === "zh";
  return (
    <LegalPage
      lang={lang}
      other="terms"
      title={L("Privacy policy", "隱私權政策")}
      updated={UPDATED[lang]}
      intro={
        <>
          <p>
            {L(
              "fuzhounese.org is a community dictionary run by one person, Noah Lee, in the United States. This page says what the site collects about you, what it makes public, and how to get it removed. It is written to be read, not skimmed past.",
              "fuzhounese.org 是一部社群辭典，由身在美國的 Noah Lee 一人經營。本頁說明本網站蒐集你的哪些資料、公開哪些內容，以及如何請我們刪除。這份說明是寫來讓人讀的，而不是讓人略過的。",
            )}
          </p>
          <p>
            {L(
              "The short version: you can read everything on the site without giving us anything. If you sign in to contribute, we keep your Google name, email and picture, the profile details you choose to add, and the words and recordings you contribute. Your email is never shown publicly. Your contributions are—that is what a dictionary is.",
              "簡而言之：你不必提供任何資料，就能閱讀網站上的所有內容。如果你登入參與貢獻，我們會保存你 Google 帳號的名稱、電子郵件地址和大頭貼、你自行選擇新增的個人檔案資料，以及你貢獻的詞和錄音。你的電子郵件地址絕不會公開顯示。你的貢獻則會公開——辭典本來就是如此。",
            )}
          </p>
        </>
      }
    >
      <Section n={1} title={L("What we collect", "我們蒐集哪些資料")}>
        <p>
          <b>{L("If you only read the site:", "如果你只瀏覽網站：")}</b>
          {L(
            " nothing that identifies you. Our host, Vercel, records ordinary server logs (your IP address, browser type and the pages requested) for a short time to run the service and keep it secure. We use Vercel Web Analytics to count visits; it does not use cookies and does not identify individual visitors.",
            "我們不會蒐集任何能識別你身分的資料。我們的主機服務商 Vercel 會短期保存一般的伺服器紀錄（你的 IP 位址、瀏覽器類型和所請求的網頁），用於運作服務並維護安全。我們使用 Vercel Web Analytics 統計造訪次數；它不使用 cookie，也不會識別個別訪客。",
          )}
        </p>
        <p>
          <b>{L("If you sign in:", "如果你登入：")}</b>
          {L(
            " sign-in is through Google. Google sends us your name, email address and profile picture, and we store them. We use a cookie to keep you signed in; it exists only for that purpose. We do not see your Google password.",
            "登入是透過 Google 進行。Google 會把你的名稱、電子郵件地址和大頭貼傳送給我們，我們會加以儲存。我們使用一個 cookie 讓你保持登入；它僅作此用途。我們看不到你的 Google 密碼。",
          )}
        </p>
        <p>
          <b>{L("Your profile:", "你的個人檔案：")}</b>
          {L(
            " anything you add on the account page—a display name, a profile picture, and, if you choose, where your Fuzhounese is from (a county or district, and optionally a town or village).",
            "你在帳號頁面新增的任何資料——顯示名稱、大頭貼，以及（若你選擇提供）你的福州話來自哪裡（縣或區，並可選填鄉鎮或村）。",
          )}
        </p>
        <p>
          <b>{L("Your contributions:", "你的貢獻：")}</b>
          {L(
            " the words, meanings, example sentences, pronunciations, requests and votes you submit, and any audio you record or upload. When you contribute, we also record the time and, if you have set it on your profile, where your Fuzhounese is from, so that a recording from Changle stays labeled Changle even if you later change your profile.",
            "你提交的詞、釋義、例句、發音、請求和投票，以及你錄製或上傳的任何音訊。你貢獻時，我們也會記錄時間；如果你已在個人檔案中設定你的福州話來自哪裡，也會一併記錄，這樣即使你日後修改個人檔案，一段來自長樂的錄音仍會標示為長樂。",
          )}
        </p>
        <p>
          <b>{L("Suggestions and reviews:", "建議與審核：")}</b>
          {L(
            " if you suggest an improvement to a word, we keep the suggestion and whether it was accepted. If you are an editor, we keep a record of what you reviewed.",
            "如果你對某個詞提出改進建議，我們會保存該建議以及它是否被採納。如果你是編輯，我們會保存你審核過哪些內容的紀錄。",
          )}
        </p>
        {zh ? (
          <p>
            <b>助手：</b>如果你使用「問問辭典」，每個問題和回答都會連同回答所花費的成本，與你的帳號一起保存。問題會傳送給
            Anthropic，由其模型產生回答，並適用
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer" className={A}>其隱私權政策</a>
            ；隨問題一起傳送的是辭典本身的文字，不包括任何關於你的資料。我們會閱讀助手無法回答的問題，以決定接下來要新增哪些詞。
          </p>
        ) : (
          <p>
            <b>The assistant:</b> if you use &ldquo;Ask the dictionary&rdquo;, each question and answer
            is kept with your account, with what it cost to answer. The question is sent to Anthropic,
            whose model produces the answer, under{" "}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer" className={A}>its privacy policy</a>
            ; the dictionary&apos;s own text goes with it, nothing about you does. We read the questions
            it could not answer to decide which words to add next.
          </p>
        )}
      </Section>

      <Section n={2} title={L("What is public", "哪些資料會公開")}>
        <p>{L("Anyone on the internet can see:", "網路上的任何人都能看到：")}</p>
        <Ul>
          <li>{L("your display name and profile picture;", "你的顯示名稱和大頭貼；")}</li>
          <li>
            {L(
              "where your Fuzhounese is from, only to the level you chose—nothing, the county or district, or the county and village;",
              "你的福州話來自哪裡，僅以你選擇的詳細程度顯示——不顯示、只顯示縣或區，或顯示縣和村；",
            )}
          </li>
          <li>{L("the month and year you joined;", "你加入的年份和月份；")}</li>
          <li>
            {L(
              "every word, meaning, example and recording you contributed that an editor has approved.",
              "你所貢獻、並經編輯核准的每一個詞、釋義、例句和錄音。",
            )}
          </li>
        </Ul>
        <p>
          {L(
            "A recording is your voice, and it is published with your display name and origin label next to it. Please do not record if you are not comfortable with that.",
            "錄音就是你的聲音，發布時旁邊會附上你的顯示名稱和來源地標示。如果你對此感到不自在，請不要錄音。",
          )}
        </p>
        <p>
          <b>{L("Never public:", "絕不公開：")}</b>
          {L(
            " your email address, the exact time of your contributions, anything an editor rejected, and a village you entered but chose not to show. If you set your origin to “Nothing” or “County only”, the village field is not stored at all.",
            "你的電子郵件地址、你貢獻的確切時間、任何被編輯退回的內容，以及你填寫了但選擇不顯示的村名。如果你將來源地設為「不顯示」或「只顯示縣或區」，村名欄位根本不會被儲存。",
          )}
        </p>
      </Section>

      <Section n={3} title={L("How we use it", "我們如何使用這些資料")}>
        <p>{L("Only to run the dictionary:", "僅用於經營這部辭典：")}</p>
        <Ul>
          <li>{L("to sign you in and show you your own contributions;", "讓你登入，並向你顯示你自己的貢獻；")}</li>
          <li>{L("to credit you for what you add;", "為你新增的內容註明是你的貢獻；")}</li>
          <li>
            {L(
              "to label recordings and words with where the speaker's Fuzhounese is from;",
              "為錄音和詞標示講者的福州話來自哪裡；",
            )}
          </li>
          <li>
            {L(
              "to let editors review what is submitted and to stop abuse (rate limits and the like);",
              "讓編輯審核提交的內容，並防止濫用（例如頻率限制等）；",
            )}
          </li>
          <li>
            {L(
              "to contact you about your account or a contribution, if we ever need to.",
              "在有需要時，就你的帳號或某項貢獻與你聯絡。",
            )}
          </li>
        </Ul>
        <p>
          {L(
            "We do not sell your data, do not show advertising, do not build profiles of you, and do not send newsletters.",
            "我們不出售你的資料、不顯示廣告、不建立關於你的個人剖析，也不寄送電子報。",
          )}
        </p>
      </Section>

      <Section n={4} title={L("Who else sees it", "還有誰會看到這些資料")}>
        {zh ? (
          <p>
            有四家公司代表我們處理資料，各自適用其隱私權政策：
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer" className={A}>Vercel</a>{" "}
            代管網站並執行流量分析；
            <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" className={A}>Supabase</a>{" "}
            儲存資料庫、你的登入工作階段，以及音訊和圖片檔案；
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className={A}>Google</a>{" "}
            負責登入；
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer" className={A}>Anthropic</a>{" "}
            回答你向助手提出的問題。它們的伺服器可能位於與你不同的國家，因此使用本網站即表示你的資料可能會被傳輸到那裡。
          </p>
        ) : (
          <p>
            Four companies process data on our behalf, each under its own privacy policy:{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer" className={A}>Vercel</a>{" "}
            hosts the site and runs the analytics;{" "}
            <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" className={A}>Supabase</a>{" "}
            stores the database, your sign-in session and the audio and picture files;{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className={A}>Google</a>{" "}
            handles sign-in;{" "}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer" className={A}>Anthropic</a>{" "}
            answers the questions you put to the assistant. Their servers may be in a different country
            from you, so using the site means your data can be transferred there.
          </p>
        )}
        <p>
          {L(
            "Beyond that, we share personal data only if the law requires it. Published contributions are, of course, shared with everyone: see the next section.",
            "除此之外，我們只在法律要求時才分享個人資料。已發布的貢獻當然是與所有人分享的：請見下一節。",
          )}
        </p>
      </Section>

      <Section n={5} title={L("Your contributions are open content", "你的貢獻是開放內容")}>
        {zh ? (
          <p>
            辭典中發布的所有內容都以{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className={A}>
              CC BY-SA 4.0
            </a>{" "}
            授權，任何人只要註明出處並以相同方式分享，就可以複製和再利用。錄音也包括在內。貢獻一經發布，其他地方就可能存有我們無法收回的副本。
            <Link href="/terms" className={A}>《服務條款》</Link>有更多說明。
          </p>
        ) : (
          <p>
            Everything published in the dictionary is licensed{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className={A}>
              CC BY-SA 4.0
            </a>
            , which lets anyone copy and reuse it as long as they credit the source and share alike.
            That includes recordings. Once a contribution is published, copies of it may exist elsewhere
            that we cannot recall. The <Link href="/terms" className={A}>terms of service</Link>{" "}
            say more.
          </p>
        )}
      </Section>

      <Section n={6} title={L("How long we keep it", "我們保存多久")}>
        <p>
          {L(
            "Your account and profile: until you ask us to delete them. Approved contributions: as part of the dictionary, indefinitely, because removing words would break it for everyone else. Rejected submissions: kept privately with the editor's note so you can see why, until you delete your account. Assistant questions: until you delete your account. Server logs: a matter of weeks, set by Vercel.",
            "你的帳號和個人檔案：保存到你要求我們刪除為止。已核准的貢獻：作為辭典的一部分無限期保存，因為刪除詞會使辭典對其他所有人都殘缺不全。被退回的提交：連同編輯的說明不公開保存，讓你知道原因，直到你刪除帳號為止。助手問題：保存到你刪除帳號為止。伺服器紀錄：數週，由 Vercel 設定。",
          )}
        </p>
      </Section>

      <Section n={7} title={L("Your choices and rights", "你的選擇與權利")}>
        <p>
          {L(
            "You can change your display name, picture and origin settings on your account page at any time. For anything else, email ",
            "你隨時可以在帳號頁面更改顯示名稱、大頭貼和來源地設定。其他任何事項，請用你帳號上的電子郵件地址寄信至 ",
          )}
          <a href={`mailto:${LEGAL_CONTACT}`} className={A}>{LEGAL_CONTACT}</a>
          {L(" from the address on your account and we will:", "，我們將：")}
        </p>
        <Ul>
          <li>{L("send you a copy of everything we hold about you;", "寄給你一份副本，內容是我們保存的所有關於你的資料；")}</li>
          <li>{L("correct anything that is wrong;", "更正任何錯誤的資料；")}</li>
          <li>
            {L(
              "delete your account. Your profile, email, rejected submissions and pending items are removed. Recordings of your voice are removed too, if you ask. Words and meanings that were already published stay in the dictionary under the licence, credited to “a contributor” instead of your name.",
              "刪除你的帳號。你的個人檔案、電子郵件地址、被退回的提交和待審項目都會被刪除。如果你提出要求，你的聲音錄音也會被刪除。已經發布的詞和釋義會依授權條款保留在辭典中，並改為署名「一位貢獻者」，而不是你的名字。",
            )}
          </li>
        </Ul>
        <p>
          {L(
            "We answer within 30 days. If you are in California or another place with a privacy law that gives you further rights, those rights apply and the same address is the way to use them. We do not discriminate against anyone for exercising them.",
            "我們會在 30 天內回覆。如果你身在加州或其他有隱私法律賦予你更多權利的地方，這些權利同樣適用，行使方式也是寄信到同一個地址。我們不會因任何人行使這些權利而對其差別待遇。",
          )}
        </p>
      </Section>

      <Section n={8} title={L("Children", "兒童")}>
        <p>
          {L(
            "You must be at least 13 to make an account. If you are under 13 we do not knowingly collect anything from you; if a parent tells us a child has made an account, we delete it. Recordings of younger speakers are welcome through a parent's account, with the parent's consent.",
            "你必須年滿 13 歲才能建立帳號。如果你未滿 13 歲，我們不會在知情的情況下向你蒐集任何資料；如果有家長告訴我們某個孩子建立了帳號，我們會將其刪除。歡迎年紀較小的講者在家長同意下，透過家長的帳號錄音。",
          )}
        </p>
      </Section>

      <Section n={9} title={L("Security", "安全")}>
        <p>
          {L(
            "Contributions and profile changes go over an encrypted connection. Editors can see pending submissions, and the site owner can see the whole database, including email addresses; both are bound by this policy. No website can promise perfect security, and if we learn of a breach that affects you we will tell you.",
            "貢獻和個人檔案的變更都透過加密連線傳送。編輯可以看到待審的提交，站長可以看到整個資料庫，包括電子郵件地址；兩者都受本政策約束。沒有任何網站能保證絕對安全；如果我們得知有影響到你的資料外洩事件，我們會告訴你。",
          )}
        </p>
      </Section>

      <Section n={10} title={L("Changes", "變更")}>
        <p>
          {L(
            "If this policy changes in a way that matters, the date at the top changes and, if you have an account, we will say so on the site before it takes effect. Small clarifications may be made without notice.",
            "如果本政策有重要變更，頁首的日期會隨之更新；如果你有帳號，我們會在變更生效前在網站上告知。細微的釐清可能不另行通知。",
          )}
        </p>
      </Section>
    </LegalPage>
  );
}

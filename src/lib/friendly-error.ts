import type { Lang } from "./i18n";

/* The database's own messages, in the reader's language (audit, 11 Oct
   2026). The limits and checks in supabase/*.sql raise plain English
   sentences, and the forms and the recorder showed them as they came: in
   English on the Chinese site, and sometimes as a raw technical error.

   Each rule matches one of those sentences (numbers captured) and gives it
   back in both languages. Text that is already meant for the reader passes
   through untouched: a ShownError (audio-upload.ts writes its own, in the
   reader's language) or anything with Chinese in it, since the database
   only ever speaks English. Anything else becomes a general "could not be
   saved" line with the original text after it, since it may still say
   something useful. Translate once only: the output of this function is
   not something it recognises. Plain data and functions, so the browser
   and the server can both use it. */

/** An error whose message is already written for the reader, in their
 *  language. friendlyError shows it as it is. */
export class ShownError extends Error {
  readonly shown = true;
}

type Rule = { re: RegExp; en: (m: RegExpMatchArray) => string; zh: (m: RegExpMatchArray) => string };

const RULES: Rule[] = [
  {
    re: /already recorded this word twice/i,
    en: () => "You have already recorded this word twice, which is the most one person can add to a word.",
    zh: () => "你已經為這個詞錄了兩段，每個人每個詞最多錄兩段。",
  },
  {
    re: /You have (\d+) recordings waiting for review/i,
    en: (m) => `You have ${m[1]} recordings waiting for an editor. Once they have been reviewed you can add more.`,
    zh: (m) => `你有 ${m[1]} 段錄音正在等待審核。審核之後就可以再錄。`,
  },
  {
    re: /You have (\d+) words still waiting for review/i,
    en: (m) => `You have ${m[1]} words waiting for an editor. Once they have been reviewed you can add more.`,
    zh: (m) => `你有 ${m[1]} 個詞正在等待審核。審核之後就可以再新增。`,
  },
  {
    re: /You have (\d+) suggestions waiting for review/i,
    en: (m) => `You have ${m[1]} suggestions waiting for an editor. Once they have been reviewed you can add more.`,
    zh: (m) => `你有 ${m[1]} 個建議正在等待審核。審核之後就可以再提出。`,
  },
  {
    re: /You have added (\d+) recordings today, which is the daily limit of (\d+)/i,
    en: (m) => `You have added ${m[1]} recordings today, the daily limit. Please carry on tomorrow.`,
    zh: (m) => `你今天已經錄了 ${m[1]} 段，達到每日上限。請明天再繼續。`,
  },
  {
    re: /You have added (\d+) words today, which is the daily limit of (\d+)/i,
    en: (m) => `You have added ${m[1]} words today, the daily limit. Please carry on tomorrow.`,
    zh: (m) => `你今天已經新增了 ${m[1]} 個詞，達到每日上限。請明天再繼續。`,
  },
  {
    re: /You have sent (\d+) suggestions today, which is the daily limit of (\d+)/i,
    en: (m) => `You have sent ${m[1]} suggestions today, the daily limit. Please carry on tomorrow.`,
    zh: (m) => `你今天已經提出了 ${m[1]} 個建議，達到每日上限。請明天再繼續。`,
  },
  {
    re: /You have requested (\d+) words in the last day/i,
    en: (m) => `You have requested ${m[1]} words in the last day, the daily limit. Please carry on tomorrow.`,
    zh: (m) => `你在過去一天已經請求了 ${m[1]} 個詞，達到每日上限。請明天再繼續。`,
  },
  {
    re: /a lot of (recordings|words|suggestions|requests) (very quickly|in a very short time)/i,
    en: () => "That is a lot in a very short time. Please wait a moment and try again.",
    zh: () => "短時間內送出太多了。請稍等一下再試。",
  },
  {
    re: /speaker'?s Fuzhounese is from/i,
    en: () => "Choose where the speaker's Fuzhounese is from.",
    zh: () => "請選擇講者的福州話來自哪裡。",
  },
  {
    re: /Tell us where your Fuzhounese is from/i,
    en: () => "Tell us where your Fuzhounese is from (on your account page) before contributing.",
    zh: () => "貢獻內容之前，請先在帳號頁面填寫你的福州話來自哪裡。",
  },
  {
    re: /at least characters or romanization/i,
    en: () => "Fill in the word's characters or its romanization.",
    zh: () => "請填寫這個詞的漢字或羅馬字。",
  },
  {
    re: /at least one meaning|meaning needs an English definition/i,
    en: () => "Give the word at least one English meaning.",
    zh: () => "請至少填寫一個英文意思。",
  },
  {
    re: /longer than this field allows/i,
    en: () => "That is longer than this field allows. Please keep it under 500 characters.",
    zh: () => "內容太長了，請控制在 500 個字元以內。",
  },
  {
    re: /must be signed in|JWT expired/i,
    en: () => "Your sign-in has expired. Please sign in again.",
    zh: () => "登入已過期，請重新登入。",
  },
  {
    re: /not one of the places on the list/i,
    en: () => "Choose a place from the list.",
    zh: () => "請從清單裡選擇地點。",
  },
  {
    re: /meaning does not belong to this word/i,
    en: () => "That meaning belongs to another word. Reload the page and try again.",
    zh: () => "這個意思不屬於這個詞。請重新整理頁面再試。",
  },
  {
    re: /(recording|picture) is not from this site/i,
    en: (m) => (m[1].toLowerCase() === "picture" ? "That picture could not be used. Please upload it again." : "That recording could not be used. Please record it again."),
    zh: (m) => (m[1].toLowerCase() === "picture" ? "無法使用這張圖片，請重新上傳。" : "無法使用這段錄音，請重新錄一次。"),
  },
  {
    re: /suggestion cannot be empty/i,
    en: () => "Write something in the suggestion first.",
    zh: () => "請先填寫建議內容。",
  },
  {
    re: /mime type .* is not supported/i,
    en: () => "This browser records in a format the site cannot take yet. Please try Chrome, Safari or Firefox.",
    zh: () => "這個瀏覽器的錄音格式網站還不支援。請改用 Chrome、Safari 或 Firefox。",
  },
  // Before the network rule: "Upload failed: …" used to read as "Load failed"
  // and every storage refusal came out as a connection problem.
  {
    re: /payload too large|exceeded the maximum allowed size|object exceeded/i,
    en: () => "That recording is too large to upload. Please record a shorter one.",
    zh: () => "這段錄音太大，無法上傳。請錄短一點。",
  },
  {
    re: /^(TypeError: )?(Failed to fetch|Load failed|NetworkError)|NetworkError when attempting|network (error|request failed)/i,
    en: () => "Could not reach the site just now. Check your connection and try again.",
    zh: () => "目前無法連線，請檢查網路後再試一次。",
  },
];

const CJK = /[\u3400-\u9fff]/;
// audio-upload.ts puts this in front of whatever storage said.
const UPLOAD_PREFIX = /^(Upload failed: |上傳失敗：)/;

/** The reader's version of an error: pass the Error itself (so a
 *  ShownError is recognised) or its message. */
export function friendlyError(error: unknown, lang: Lang): string {
  if (error instanceof Error && (error as Partial<ShownError>).shown) return error.message;
  const raw = (error instanceof Error ? error.message : typeof error === "string" ? error : "").trim();
  const text = raw.replace(UPLOAD_PREFIX, "");
  if (CJK.test(text)) return text;
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) return lang === "zh" ? r.zh(m) : r.en(m);
  }
  if (!text) return lang === "zh" ? "目前無法儲存，請再試一次。" : "That could not be saved just now. Please try again.";
  return lang === "zh" ? `無法儲存。（${text}）` : `That could not be saved. (${text})`;
}

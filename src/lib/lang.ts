import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, type Lang } from "./i18n";

/** The visitor's language, from the cookie. Server components only —
 *  the strings themselves live in i18n.ts, which the client may import. */
export function getLang(): Lang {
  const v = cookies().get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "en";
}

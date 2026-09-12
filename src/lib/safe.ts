import { cookies } from "next/headers";
import { SAFE_COOKIE } from "./content-filter";

/** Is the content filter on? Server components only — content-filter.ts
 *  holds the patterns themselves and the client may import it.
 *
 *  On unless the cookie says otherwise, so a first-time visitor, a search
 *  engine and anyone who has never opened their account page all get the
 *  filtered dictionary. */
export function getSafe(): boolean {
  return cookies().get(SAFE_COOKIE)?.value !== "off";
}

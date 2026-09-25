import { cookies } from "next/headers";
import { ROM_COOKIE, showRom, type RomSystem } from "./romanization";

/** The reader's romanization, from the cookie (RomToggle). Server only; the
 *  conversion itself lives in romanization.ts, which the client may import. */
export function getRom(): RomSystem {
  return cookies().get(ROM_COOKIE)?.value === "yngping" ? "yngping" : "buc";
}

/** A word's romanization in the reader's system (see showRom). */
export function romText(rom: string | null | undefined, headword: string): string {
  return showRom(rom, headword, getRom()).text;
}

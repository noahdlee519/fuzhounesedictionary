import "server-only";
import { createClient } from "@supabase/supabase-js";

/* Shared by the open-data feeds (src/app/api/export/*), documented on /data. */

export const LICENSE = "CC BY-SA 4.0";
export const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

/* A database client that sees only what anyone may see: the public (anon)
   key and no cookies, so the row rules decide. Every read is no-store —
   left to Next, the feed's database read was cached for a year — so
   freshness is only the edge cache's business (FEED_HEADERS). */
export function anonDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

/* An hour at Vercel's edge, and up to a day of the last good copy while a
   new one is fetched: however often a feed is polled, the database is read
   at most once an hour per address. Readable from any site's scripts. */
export const FEED_HEADERS: Record<string, string> = {
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*",
};

/* One CSV cell: RFC 4180 quoting, plus a guard against spreadsheet
   formulas — a cell a contributor wrote (a note, a name) that starts with
   = + - @ would run as a formula in Excel or Sheets, so it gets a leading
   apostrophe. */
export function csvCell(v: string | number | boolean | null): string {
  if (v == null) return "";
  let s = typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* A whole CSV file: a byte-order mark so Excel reads it as UTF-8 (the
   characters and tone marks), CRLF line ends. */
export function csvFile(header: string[], rows: (string | number | boolean | null)[][]): string {
  const lines = [header.join(",")];
  for (const r of rows) lines.push(r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

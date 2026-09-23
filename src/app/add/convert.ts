"use server";

import { readTraditional, type TraditionalReading } from "@/lib/chinese";

/* The Add a word form's "saved in traditional characters" line asks here, so
   the conversion table stays on the server (it is large). */
export async function traditionalFor(s: string): Promise<TraditionalReading> {
  return readTraditional(String(s ?? "").slice(0, 60));
}

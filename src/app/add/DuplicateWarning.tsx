"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useL } from "@/components/LangProvider";

/* A warning, not a block (Noah, 23 Sep 2026): as someone types the word,
   look for a live entry with the same characters or the same romanization
   and name it, linked, under the fields. Some words that match are
   legitimately new (a different reading of the same characters, a local
   variant), so the form still submits; the point is that a person about to
   re-add 食 sees the existing entry and can record or improve it there.

   Matching is exact on the characters and case-insensitive on the
   romanization (tone marks count: "siah" does not match "siăh"). */

type Match = { id: string; hanzi: string | null; romanization: string | null; headword: string; gloss: string | null };

const DEBOUNCE_MS = 400;
const SELECT = "id, hanzi, romanization, headword, senses(definition_en, sort)";

/** ilike with no wildcards is a case-insensitive equals; escape the wildcards
 *  a person might type so they are taken literally. */
const literal = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export default function DuplicateWarning({ hanzi, romanization }: { hanzi: string; romanization: string }) {
  const L = useL();
  const [matches, setMatches] = useState<Match[]>([]);
  const h = hanzi.trim();
  const r = romanization.trim();

  useEffect(() => {
    if (!h && !r) {
      setMatches([]);
      return;
    }
    let live = true;
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const base = () => supabase.from("entries").select(SELECT).eq("status", "approved").limit(3);
      const queries = [
        h ? base().eq("hanzi", h) : null,
        r ? base().ilike("romanization", literal(r)) : null,
        r ? base().ilike("headword", literal(r)) : null,
      ].filter(Boolean) as ReturnType<typeof base>[];
      try {
        const results = await Promise.all(queries);
        if (!live) return;
        const seen = new Map<string, Match>();
        for (const { data } of results) {
          for (const e of (data as any[]) ?? []) {
            if (seen.has(e.id)) continue;
            const first = [...(e.senses ?? [])].sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))[0];
            seen.set(e.id, { id: e.id, hanzi: e.hanzi, romanization: e.romanization, headword: e.headword, gloss: first?.definition_en ?? null });
          }
        }
        setMatches([...seen.values()].slice(0, 3));
      } catch {
        /* the check is a courtesy; if it fails the form works as before */
      }
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [h, r]);

  if (!matches.length) return null;

  return (
    <div role="status" className="border-l-2 border-lacquer bg-surface px-4 py-3 text-sm text-inkSoft">
      <p>
        {L("This word may already be in the dictionary:", "這個詞可能已經在辭典裡了：")}
      </p>
      <ul className="mt-1.5 space-y-1">
        {matches.map((m) => (
          <li key={m.id}>
            <Link href={`/entry/${m.id}`} target="_blank" className="text-lacquer hover:underline">
              {m.hanzi && <span className="han mr-1.5">{m.hanzi}</span>}
              <span className="romanization">{m.romanization || m.headword}</span>
            </Link>
            {m.gloss && <span className="text-inkFaint"> · {m.gloss}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-inkFaint">
        {L(
          "If it is the same word, you can record it or improve it on its page. If yours is different, carry on.",
          "如果是同一個詞，可以在詞條頁錄音或補充。如果不一樣，請繼續填寫。"
        )}
      </p>
    </div>
  );
}

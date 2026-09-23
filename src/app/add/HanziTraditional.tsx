"use client";

import { useEffect, useState } from "react";
import { useL } from "@/components/LangProvider";
import { traditionalFor } from "./convert";

/* Characters typed in simplified, saved in traditional (Noah, 23 Sep 2026).
   The dictionary writes every word in traditional characters; many speakers
   type simplified. Under the Characters field, once the typing pauses: the
   traditional form that will be saved. Where a simplified character stands
   for more than one traditional one (发 → 發 or 髮), its options as small
   buttons, the likeliest chosen. "Keep what I typed" saves the characters as
   typed instead (a character that only looks simplified, or a local form).

   Tells the form what to save through onResolved: the traditional form, or
   null for "as typed". Shows nothing when there is nothing to convert. */

type Reading = Awaited<ReturnType<typeof traditionalFor>>;
const DEBOUNCE_MS = 300;

export default function HanziTraditional({ value, onResolved }: { value: string; onResolved: (v: string | null) => void }) {
  const L = useL();
  const typed = value.trim();
  const [reading, setReading] = useState<{ for: string; r: Reading } | null>(null);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [keep, setKeep] = useState(false);

  // A new word typed: forget the last one's choices, then ask.
  useEffect(() => {
    setPicks({});
    setKeep(false);
    if (!/[㐀-鿿豈-﫿]/.test(typed)) {
      setReading(null);
      return;
    }
    let live = true;
    const timer = window.setTimeout(async () => {
      try {
        const r = await traditionalFor(typed);
        if (live) setReading({ for: typed, r });
      } catch {
        /* the conversion is a help; without it the word is saved as typed */
      }
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [typed]);

  const current = reading && reading.for === typed ? reading.r : null;
  const chars = current ? Array.from(current.converted) : [];
  for (const [at, ch] of Object.entries(picks)) chars[Number(at)] = ch;
  const result = chars.join("");
  const differs = Boolean(current) && current!.converted !== typed && result !== typed;

  useEffect(() => {
    onResolved(differs && !keep ? result : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [differs, keep, result]);

  // Nothing to convert (typed in traditional already, or a character both
  // scripts share): nothing to say. The per-character choices only come up
  // when the word as typed reads as simplified, so someone typing 面 in
  // traditional is not asked about 麵.
  if (!current || current.converted === typed) return null;

  const pickBtn = (at: number, option: string, on: boolean) => (
    <button
      key={option}
      type="button"
      aria-pressed={on}
      onClick={() => setPicks((p) => ({ ...p, [at]: option }))}
      className={
        "han min-w-[2rem] rounded-sm border px-1.5 py-0.5 text-base leading-tight transition-colors " +
        (on ? "border-ink bg-ink text-paper" : "border-ruleStrong text-ink hover:border-ink")
      }
    >
      {option}
    </button>
  );

  return (
    <div className="-mt-1 space-y-2 border-l-2 border-rule pl-3 text-sm text-inkSoft">
      {keep ? (
        <p>
          {L("Saved as typed:", "照你輸入的儲存：")} <span className="han text-ink">{typed}</span>{" "}
          <button type="button" onClick={() => setKeep(false)} className="text-lacquer hover:underline">
            {L("Use traditional characters", "改用繁體字")}
          </button>
        </p>
      ) : (
        <>
          <p>
            {L("Saved in traditional characters:", "會以繁體字儲存：")}{" "}
            <span className="han text-base text-ink">{result}</span>{" "}
            <button type="button" onClick={() => setKeep(true)} className="whitespace-nowrap text-inkFaint hover:text-lacquer hover:underline">
              {L("Keep what I typed", "保留我輸入的")}
            </button>
          </p>
          {current.choices.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-inkFaint">
                {L("Some characters have more than one traditional form. Choose the one you mean:", "有些字的繁體不只一種，請選你要的：")}
              </p>
              {current.choices.map((c) => {
                const chosen = picks[c.at] ?? c.options[0];
                return (
                  <div key={c.at} className="flex flex-wrap items-center gap-1.5">
                    <span className="han w-6 text-base text-inkFaint">{c.typed}</span>
                    <span aria-hidden className="text-inkFaint">→</span>
                    {c.options.map((o) => pickBtn(c.at, o, o === chosen))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

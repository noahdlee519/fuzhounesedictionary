"use client";

import { useRouter } from "next/navigation";

/* The origin filter as a dropdown. It navigates on change, keeping the current
   part-of-speech and sort and resetting to page 1 — the same rules the chip
   links used. Regions with nothing recorded yet are disabled rather than hidden,
   so the list still reads as a full map of where Fuzhounese is spoken. */
type Area = { code: string; label: string; hanzi: string; group: string };

export default function OriginFilter({
  value,
  pos,
  sort,
  groups,
  areas,
  emptyCodes = [],
}: {
  value: string;
  pos: string;
  sort: string;
  groups: readonly string[];
  areas: readonly Area[];
  emptyCodes?: string[];
}) {
  const router = useRouter();
  const empty = new Set(emptyCodes);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const origin = e.target.value;
    const params: Record<string, string> = {};
    if (pos) params.pos = pos;
    if (origin) params.origin = origin;
    if (sort) params.sort = sort;
    const qs = new URLSearchParams(params).toString();
    router.push(`/learn${qs ? `?${qs}` : ""}#words`);
  }

  return (
    <select
      aria-label="Filter words by origin"
      value={value}
      onChange={onChange}
      className="w-full max-w-xs border border-rule bg-surface px-3 py-2 text-[15px] outline-none focus:border-lacquer sm:w-auto"
    >
      <option value="">Anywhere</option>
      {groups.map((g) => (
        <optgroup key={g} label={g}>
          {areas
            .filter((a) => a.group === g)
            .map((a) => (
              <option key={a.code} value={a.code} disabled={empty.has(a.code)}>
                {a.label} {a.hanzi}
                {empty.has(a.code) ? " — none yet" : ""}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

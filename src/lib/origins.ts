// ---------------------------------------------------------------------------
//  Where a contributor's Fuzhounese comes from.
//  The 11 cities/counties of the Houguan (侯官) group — Fuzhou dialect proper —
//  plus Matsu, the neighbouring Eastern Min areas, and catch-alls.
//  Codes are stored in the database; never renumber or rename an existing one.
// ---------------------------------------------------------------------------

export interface OriginArea {
  code: string;
  label: string;   // English
  hanzi: string;
  group: string;
}

export const ORIGIN_AREAS: OriginArea[] = [
  // Fuzhou municipal districts — the city itself
  { code: "gulou",    label: "Gulou",    hanzi: "鼓樓", group: "Fuzhou city" },
  { code: "taijiang", label: "Taijiang", hanzi: "台江", group: "Fuzhou city" },
  { code: "cangshan", label: "Cangshan", hanzi: "倉山", group: "Fuzhou city" },
  { code: "mawei",    label: "Mawei",    hanzi: "馬尾", group: "Fuzhou city" },
  { code: "jinan",    label: "Jin'an",   hanzi: "晉安", group: "Fuzhou city" },
  { code: "fuzhou_unsure", label: "Fuzhou city (not sure which district)", hanzi: "福州", group: "Fuzhou city" },

  // The rest of the Houguan group
  { code: "changle",  label: "Changle",  hanzi: "長樂", group: "Fuzhou prefecture" },
  { code: "fuqing",   label: "Fuqing",   hanzi: "福清", group: "Fuzhou prefecture" },
  { code: "minhou",   label: "Minhou",   hanzi: "閩侯", group: "Fuzhou prefecture" },
  { code: "lianjiang",label: "Lianjiang",hanzi: "連江", group: "Fuzhou prefecture" },
  { code: "luoyuan",  label: "Luoyuan",  hanzi: "羅源", group: "Fuzhou prefecture" },
  { code: "minqing",  label: "Minqing",  hanzi: "閩清", group: "Fuzhou prefecture" },
  { code: "yongtai",  label: "Yongtai",  hanzi: "永泰", group: "Fuzhou prefecture" },
  { code: "pingtan",  label: "Pingtan",  hanzi: "平潭", group: "Fuzhou prefecture" },
  { code: "gutian",   label: "Gutian",   hanzi: "古田", group: "Fuzhou prefecture" },
  { code: "pingnan",  label: "Pingnan",  hanzi: "屏南", group: "Fuzhou prefecture" },

  // Beyond
  { code: "matsu",    label: "Matsu Islands (Lienchiang)", hanzi: "馬祖", group: "Beyond Fuzhou" },
  { code: "ningde",   label: "Ningde area (Funing)",       hanzi: "寧德", group: "Beyond Fuzhou" },
  { code: "fujian_other", label: "Elsewhere in Fujian",    hanzi: "福建", group: "Beyond Fuzhou" },
  { code: "overseas", label: "Overseas community",         hanzi: "海外", group: "Beyond Fuzhou" },
];

export const ORIGIN_AREA_CODES: string[] = ORIGIN_AREAS.map((a) => a.code);

export const ORIGIN_GROUPS: string[] = Array.from(new Set(ORIGIN_AREAS.map((a) => a.group)));

export function originArea(code: string | null | undefined): OriginArea | null {
  if (!code) return null;
  return ORIGIN_AREAS.find((a) => a.code === code) ?? null;
}

/** "Sanxi, Changle 長樂" — the one-line public form. */
export function formatOrigin(
  code: string | null | undefined,
  locality: string | null | undefined
): string | null {
  const area = originArea(code);
  if (!area) return null;
  const place = `${area.label} ${area.hanzi}`;
  const town = (locality ?? "").trim();
  return town ? `${town}, ${place}` : place;
}

export const ORIGIN_PRECISIONS = ["hidden", "area", "locality"] as const;
export type OriginPrecision = (typeof ORIGIN_PRECISIONS)[number];

import type { Lang } from "./i18n";

/* Chip colours for a contribution's review status — the same three on the
   account page and in a person's recording list, so they never drift apart. */
export const STATUS_STYLE: Record<string, string> = {
  // The site's own amber (--amber, which has a dark-mode value of its own).
  // This was Tailwind's amber-700 etc., which the theme does not have — its
  // `amber` is the one colour — so the pending chip came out uncoloured with
  // a default blue ring (audit, 11 Oct 2026).
  pending: "text-amber ring-amber",
  /** Approved, but on a word that is not live yet: shown as waiting. */
  waiting: "text-amber ring-amber",
  approved: "text-lacquer ring-lacquer",
  rejected: "text-inkFaint ring-rule",
};

/* The words on those chips. English shows the stored value as it always has;
   Chinese gets a label. Plain data, so client and server code can both use it. */
const STATUS_ZH: Record<string, string> = {
  pending: "待審",
  approved: "已刊出",
  rejected: "已退回",
  waiting: "等詞條刊出",
};

export function statusLabel(status: string, lang: Lang): string {
  if (lang === "zh") return STATUS_ZH[status] ?? status;
  return status === "waiting" ? "waiting for the word" : status;
}

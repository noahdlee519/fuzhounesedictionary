import type { Lang } from "./i18n";

/* Chip colours for a contribution's review status — the same three on the
   account page and in a person's recording list, so they never drift apart. */
export const STATUS_STYLE: Record<string, string> = {
  pending: "text-amber-700 ring-amber-600/40 dark:text-amber-300",
  approved: "text-lacquer ring-lacquer",
  rejected: "text-inkFaint ring-rule",
};

/* The words on those chips. English shows the stored value as it always has;
   Chinese gets a label. Plain data, so client and server code can both use it. */
const STATUS_ZH: Record<string, string> = {
  pending: "待審",
  approved: "已刊出",
  rejected: "已退回",
};

export function statusLabel(status: string, lang: Lang): string {
  return lang === "zh" ? STATUS_ZH[status] ?? status : status;
}

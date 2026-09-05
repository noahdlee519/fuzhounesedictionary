/* Chip colours for a contribution's review status — the same three on the
   account page and in a person's recording list, so they never drift apart. */
export const STATUS_STYLE: Record<string, string> = {
  pending: "text-amber-700 ring-amber-600/40 dark:text-amber-300",
  approved: "text-lacquer ring-lacquer",
  rejected: "text-inkFaint ring-rule",
};

import Link from "next/link";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

/* Previous · "Page [3] of 12 · Go" · Next, for any paginated list.

   The page number is a box you can type into. A plain GET form, so it works
   with no JavaScript: the list's other query parameters ride along as hidden
   fields, and the fragment on the action lands the scroll at the list. The
   caller clamps a number past the end. Renders nothing for a single page. */
export default function Pager({
  page,
  totalPages,
  basePath,
  params = {},
  pageParam = "page",
  anchor,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  /** The path the list lives on, e.g. "/contributor/abc". */
  basePath: string;
  /** Query parameters to keep across pages (filters, tabs). */
  params?: Record<string, string>;
  pageParam?: string;
  /** Element id the list scrolls to on arrival, without the "#". */
  anchor: string;
  nextLabel?: string;
}) {
  if (totalPages <= 1) return null;
  const L = pick(getLang());

  const href = (p: number) => {
    const qs = new URLSearchParams({ ...params, ...(p > 1 ? { [pageParam]: String(p) } : {}) });
    const s = qs.toString();
    return `${basePath}${s ? `?${s}` : ""}#${anchor}`;
  };
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const inputId = `${anchor}-page-jump`;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-rule pt-4 meta">
      {hasPrev ? (
        <Link href={href(page - 1)} className="text-inkSoft hover:text-lacquer">
          {L("← Previous", "← 上一頁")}
        </Link>
      ) : (
        <span />
      )}
      <form action={`${basePath}#${anchor}`} method="get" className="flex items-center gap-1.5 text-inkFaint">
        {Object.entries(params).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label htmlFor={inputId}>{L("Page", "第")}</label>
        <input
          id={inputId}
          name={pageParam}
          type="number"
          inputMode="numeric"
          min={1}
          max={totalPages}
          defaultValue={page}
          aria-label={L("Page number, 1 to {n}", "頁碼，1 到 {n}", { n: totalPages })}
          className="rounded-sm w-12 border border-rule bg-surface px-1.5 py-0.5 text-center text-xs tabular-nums text-ink outline-none focus:border-lacquer [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span>{L("of {n}", "頁，共 {n} 頁", { n: totalPages })}</span>
        <button
          type="submit"
          className="rounded-sm ml-1 border border-rule px-2 py-0.5 text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer"
        >
          {L("Go", "前往")}
        </button>
      </form>
      {hasNext ? (
        <Link href={href(page + 1)} className="text-inkSoft hover:text-lacquer">
          {nextLabel ?? L("Next →", "下一頁 →")}
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

import Link from "next/link";

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
  nextLabel = "Next →",
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

  const href = (p: number) => {
    const qs = new URLSearchParams({ ...params, ...(p > 1 ? { [pageParam]: String(p) } : {}) });
    const s = qs.toString();
    return `${basePath}${s ? `?${s}` : ""}#${anchor}`;
  };
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const inputId = `${anchor}-page-jump`;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-rule pt-4 font-mono text-xs uppercase tracking-[0.1em]">
      {hasPrev ? (
        <Link href={href(page - 1)} className="text-inkSoft hover:text-lacquer">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <form action={`${basePath}#${anchor}`} method="get" className="flex items-center gap-1.5 text-inkFaint">
        {Object.entries(params).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label htmlFor={inputId}>Page</label>
        <input
          id={inputId}
          name={pageParam}
          type="number"
          inputMode="numeric"
          min={1}
          max={totalPages}
          defaultValue={page}
          aria-label={`Page number, 1 to ${totalPages}`}
          className="w-12 border border-rule bg-surface px-1.5 py-0.5 text-center font-mono text-xs tabular-nums text-ink outline-none focus:border-lacquer [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span>of {totalPages}</span>
        <button
          type="submit"
          className="ml-1 border border-rule px-2 py-0.5 text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer"
        >
          Go
        </button>
      </form>
      {hasNext ? (
        <Link href={href(page + 1)} className="text-inkSoft hover:text-lacquer">
          {nextLabel}
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

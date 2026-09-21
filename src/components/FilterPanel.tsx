"use client";

import { useState } from "react";

/* The Browse filters on a phone. There they fill about three screens, and
   the words — what people came for — started below all of them. So on a
   narrow screen the filters sit behind one "Filters" button that names what
   is chosen; from 640px up the button is gone and the filters show as
   before, each group folding on its own. The filters are server-rendered
   and handed in as children; this holds only the open/closed switch. */
export default function FilterPanel({
  summary,
  children,
}: {
  /** What is chosen now, e.g. "noun · Changle"; empty when nothing is. */
  summary: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="browse-filters"
        className="btn btn-ghost btn-sm w-full justify-between sm:hidden"
      >
        <span>
          Filters
          {summary && <span className="ml-2 font-normal text-inkSoft">· {summary}</span>}
        </span>
        <span aria-hidden className={"text-[10px] transition-transform " + (open ? "rotate-90" : "")}>
          &#9656;
        </span>
      </button>
      <div id="browse-filters" className={(open ? "mt-4 block" : "hidden") + " sm:mt-0 sm:block"}>
        {children}
      </div>
    </div>
  );
}

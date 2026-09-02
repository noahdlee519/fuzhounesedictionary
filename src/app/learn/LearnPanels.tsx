"use client";

import { useState } from "react";

/* Three buttons above the word list — Features, Orthography, Further reading —
   each opening one panel. One panel at a time; the first is open on arrival;
   pressing the open one folds it away. The panel bodies are server-rendered
   and handed in as children, so this file holds only the switch. */

export interface Panel {
  key: string;
  label: string;
  body: React.ReactNode;
}

export default function LearnPanels({ panels }: { panels: Panel[] }) {
  const [open, setOpen] = useState<string | null>(panels[0]?.key ?? null);
  const current = panels.find((p) => p.key === open) ?? null;

  return (
    <section className="space-y-4">
      <div role="tablist" aria-label="About Fuzhounese" className="flex flex-wrap gap-2">
        {panels.map((p) => {
          const active = p.key === open;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={`tab-${p.key}`}
              aria-selected={active}
              aria-expanded={active}
              aria-controls={`panel-${p.key}`}
              onClick={() => setOpen(active ? null : p.key)}
              className={
                "border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors " +
                (active
                  ? "border-lacquer bg-lacquer text-paper"
                  : "border-rule text-inkSoft hover:border-lacquer hover:text-lacquer")
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {current && (
        <div
          key={current.key}
          role="tabpanel"
          id={`panel-${current.key}`}
          aria-labelledby={`tab-${current.key}`}
          className="page-fade space-y-5 border border-rule bg-surface p-5 sm:p-6"
        >
          {current.body}
        </div>
      )}
    </section>
  );
}

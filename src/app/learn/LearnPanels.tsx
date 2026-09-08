"use client";

import { useEffect, useRef, useState } from "react";

/* Three buttons above the word list — Features, Orthography, Further reading —
   each opening one panel. One panel at a time; the first is open on arrival;
   pressing the open one folds it away. The panel bodies are server-rendered
   and handed in as children, so this file holds only the switch. */

const NO_ANCHORS: Record<string, string> = {};

export interface Panel {
  key: string;
  label: string;
  body: React.ReactNode;
}

export default function LearnPanels({
  panels,
  anchors = NO_ANCHORS,
}: {
  panels: Panel[];
  /** id inside a panel body → that panel's key, so "#tones" can open it. */
  anchors?: Record<string, string>;
}) {
  const [open, setOpen] = useState<string | null>(panels[0]?.key ?? null);
  const current = panels.find((p) => p.key === open) ?? null;
  const index = panels.findIndex((p) => p.key === open);
  const prev = index > 0 ? panels[index - 1] : null;
  const next = index >= 0 && index < panels.length - 1 ? panels[index + 1] : null;
  const top = useRef<HTMLElement>(null);

  /* The arrows at the foot of a panel. The panel element is keyed on its
     panel, so switching remounts it and the fade-in plays again; and since
     the arrows sit at the bottom of what may be a long panel, the view is
     brought back up to the tabs so the new panel is read from its start. */
  const go = (key: string) => {
    setOpen(key);
    requestAnimationFrame(() => {
      top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  /* A link to an id inside a closed panel has nothing to scroll to. Watch the
     hash: if it names a known anchor, open its panel, then scroll once the
     panel has rendered. Runs on arrival too, for a link from another page. */
  useEffect(() => {
    const follow = () => {
      const id = window.location.hash.slice(1);
      const key = anchors[id];
      if (!key) return;
      setOpen(key);
      // After React has painted the newly opened panel.
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, [anchors]);

  return (
    <section ref={top} className="scroll-mt-3 space-y-4">
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

          {(prev || next) && (
            <nav
              aria-label="Neighbouring sections"
              className="flex items-center justify-between gap-4 border-t border-rule pt-4 font-mono text-xs uppercase tracking-[0.1em]"
            >
              {prev ? (
                <button
                  type="button"
                  onClick={() => go(prev.key)}
                  className="text-inkSoft transition-colors hover:text-lacquer"
                >
                  ← {prev.label}
                </button>
              ) : (
                <span />
              )}
              {next ? (
                <button
                  type="button"
                  onClick={() => go(next.key)}
                  className="text-inkSoft transition-colors hover:text-lacquer"
                >
                  {next.label} →
                </button>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      )}
    </section>
  );
}

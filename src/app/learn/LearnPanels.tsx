"use client";

import { useEffect, useRef, useState } from "react";

/* Three chips under "How it works" — Features, Orthography, Sources — each
   opening one panel. One panel at a time; the first is open on arrival;
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
  initial,
}: {
  panels: Panel[];
  /** id inside a panel body → that panel's key, so "#tones" can open it. */
  anchors?: Record<string, string>;
  /** The panel named by ?tab= in the address, so /learn?tab=orthography
   *  opens on Orthography (server-rendered, so it is right before any
   *  JavaScript runs). */
  initial?: string;
}) {
  const known = (k?: string | null) => (k && panels.some((p) => p.key === k) ? k : null);
  const [open, setOpen] = useState<string | null>(known(initial) ?? panels[0]?.key ?? null);

  /* Keep the address in step, so the panel someone is reading is what they
     copy and share. replaceState rather than a navigation: no history entry,
     no re-render, and the hash is dropped since it named the old panel. */
  const choose = (key: string | null) => {
    setOpen(key);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (key && key !== panels[0]?.key) url.searchParams.set("tab", key);
    else url.searchParams.delete("tab");
    url.hash = "";
    window.history.replaceState(window.history.state, "", url);
  };
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
    choose(key);
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
      // "#orthography" names a panel; "#tones" names an id inside one.
      const key = known(id) ?? anchors[id];
      if (!key) return;
      setOpen(key);
      if (key === id) return;
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
    <section ref={top} className="scroll-mt-20 space-y-6">
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
              onClick={() => choose(active ? null : p.key)}
              className={"chip" + (active ? " chip-on" : "")}
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
          className="page-fade space-y-5 rounded-xl border border-rule bg-surface p-5 sm:p-7"
        >
          {current.body}

          {(prev || next) && (
            <nav
              aria-label="Neighbouring sections"
              className="flex items-center justify-between gap-4 border-t border-rule pt-4 text-sm font-medium"
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

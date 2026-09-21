"use client";

import { useEffect, useRef, useState } from "react";

/* Three folder tabs under "How it works" — Features, Orthography, Sources —
   each showing one panel. One panel at a time; the first is open on arrival. The panel bodies are server-rendered
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
  /** id inside a panel body → that panel's key, so "#tones" can open it. */
  anchors?: Record<string, string>;
  /** The panel named by ?tab= in the address, so /learn?tab=orthography
   *  opens on Orthography (server-rendered, so it is right before any
   *  JavaScript runs). */
  initial?: string;
}) {
  // The Sources tab's key is "reading" (older links use it); "sources", the
  // name on the tab, opens it too.
  const ALIASES: Record<string, string> = { sources: "reading" };
  const known = (k?: string | null) => {
    const key = k ? ALIASES[k] ?? k : null;
    return key && panels.some((p) => p.key === key) ? key : null;
  };
  const [open, setOpen] = useState<string | null>(known(initial) ?? panels[0]?.key ?? null);

  /* Keep the address in step, so the panel someone is reading is what they
     copy and share. replaceState rather than a navigation: no history entry,
     no re-render, and the hash is dropped since it named the old panel. */
  const choose = (key: string) => {
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

  /* Folder tabs: the open tab shares the panel's background and has no
     bottom edge, and it sits one pixel over the panel's top border, so the
     tab and the page below it read as one sheet. The closed tabs sit behind,
     a shade darker. One is always open — a folder does not close. */
  return (
    <section ref={top} className="scroll-mt-20">
      <div role="tablist" aria-label="About Fuzhounese" className="relative z-10 -mb-px flex gap-1">
        {panels.map((p) => {
          const active = p.key === open;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={`tab-${p.key}`}
              aria-selected={active}
              aria-controls={`panel-${p.key}`}
              onClick={() => choose(p.key)}
              className={
                "ui min-w-0 rounded-t-sm border border-rule px-4 py-2.5 text-sm font-medium transition-colors active:bg-surface sm:px-5 " +
                (active
                  ? "border-b-surface bg-surface text-ink"
                  : "bg-surface2 text-inkSoft hover:text-ink")
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
          className="space-y-8 rounded-b-sm rounded-tr-sm border border-rule bg-surface p-5 sm:p-8"
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
                  {next.label} →
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

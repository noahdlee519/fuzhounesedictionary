"use client";

import { useRef } from "react";

/* A row of words whose hover panels (.tip, inside each .tip-host) open under
   the word itself. Each panel starts at its word's left edge; if that would
   run past the right edge of the page, it lines up with the word's right
   edge instead. Measured when the pointer or keyboard focus arrives, so
   it is right however the row wraps. */
export default function TipRow({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const place = (target: EventTarget | null) => {
    const host = (target as HTMLElement | null)?.closest?.(".tip-host") as HTMLElement | null;
    const tip = host?.querySelector(".tip") as HTMLElement | null;
    if (!host || !tip) return;
    const room = window.innerWidth - 16;
    const left = host.getBoundingClientRect().left;
    host.dataset.flip = left + tip.offsetWidth > room ? "right" : "left";
  };
  return (
    <ul
      ref={ref}
      className={className}
      onPointerOver={(e) => place(e.target)}
      onFocus={(e) => place(e.target)}
    >
      {children}
    </ul>
  );
}

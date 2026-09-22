"use client";

import { useEffect } from "react";

/* Every tooltip opens under its trigger, from the trigger's left edge. Near
   an edge of the screen that would run off it, so just before one opens
   (pointer over, or focus) this measures and sets --tip-x on the trigger:
   the sideways shift that keeps the panel 12px inside the screen, or 0
   (globals.css, .info-tip). One listener for the whole page. */
const GUTTER = 12;

export default function TipFlip() {
  useEffect(() => {
    const fit = (e: Event) => {
      const host = (e.target as Element | null)?.closest?.(".has-info") as HTMLElement | null;
      const tip = host?.querySelector(".info-tip") as HTMLElement | null;
      if (!host || !tip) return;
      const left = host.getBoundingClientRect().left;
      const overRight = left + tip.offsetWidth - (window.innerWidth - GUTTER);
      const shift = overRight > 0 ? Math.max(GUTTER - left, -overRight) : 0;
      host.style.setProperty("--tip-x", `${Math.round(shift)}px`);
    };
    document.addEventListener("pointerover", fit, true);
    document.addEventListener("focusin", fit, true);
    return () => {
      document.removeEventListener("pointerover", fit, true);
      document.removeEventListener("focusin", fit, true);
    };
  }, []);
  return null;
}

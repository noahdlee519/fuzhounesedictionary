"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* Every tooltip opens under its trigger, from the trigger's left edge. Near
   an edge of the screen that would run off it, so this measures and sets
   --tip-x on the trigger: the sideways shift that keeps the panel 12px
   inside the screen, or 0 (globals.css, .info-tip).

   It runs just before a tip opens (pointer over, or focus), and also for
   every tip on the page when it loads, after a client-side navigation and
   when the window is resized. A closed tip is invisible but still takes up
   room, and one left hanging off the right edge let the whole page be
   dragged sideways on a phone (the home page's "i", Noah, 14 Oct 2026). */
const GUTTER = 12;

function fit(host: HTMLElement) {
  const tip = host.querySelector(".info-tip") as HTMLElement | null;
  if (!tip) return;
  const left = host.getBoundingClientRect().left;
  const overRight = left + tip.offsetWidth - (document.documentElement.clientWidth - GUTTER);
  const shift = overRight > 0 ? Math.max(GUTTER - left, -overRight) : 0;
  host.style.setProperty("--tip-x", `${Math.round(shift)}px`);
}

function fitAll() {
  document.querySelectorAll<HTMLElement>(".has-info").forEach(fit);
}

export default function TipFlip() {
  const pathname = usePathname();

  useEffect(() => {
    const onEvent = (e: Event) => {
      const host = (e.target as Element | null)?.closest?.(".has-info") as HTMLElement | null;
      if (host) fit(host);
    };
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fitAll);
    };
    document.addEventListener("pointerover", onEvent, true);
    document.addEventListener("focusin", onEvent, true);
    window.addEventListener("resize", onResize);
    // Fonts change the width of the text a tip sits in.
    document.fonts?.ready.then(fitAll).catch(() => {});
    return () => {
      document.removeEventListener("pointerover", onEvent, true);
      document.removeEventListener("focusin", onEvent, true);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Each page's tips, once it has rendered.
  useEffect(() => {
    const frame = requestAnimationFrame(fitAll);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}

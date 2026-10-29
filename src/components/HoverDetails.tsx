"use client";

import { useEffect, useRef } from "react";

/* A <details> that also opens when the pointer rests on its summary — for a
   fold whose contents are a short list of links, where making someone click
   just to see four links is a step too many (Noah, 29 Oct 2026).

   Only with a mouse or trackpad: on a touchscreen there is no hover, and the
   emulated one would open the fold just before the tap closed it again, so
   there the summary is a plain tap target, as before. Keyboards and screen
   readers get the native <details> behaviour unchanged.

   Opened by hovering, it closes again when the pointer leaves the whole fold
   (after a short pause, so a pointer cutting a corner on its way to a link
   does not snap it shut). A click while it is open from a hover keeps it open
   instead of toggling it closed — the click means "yes, this one" — and from
   then on it stays until clicked again. */
export default function HoverDetails({
  summary,
  summaryClassName,
  className,
  children,
}: {
  summary: React.ReactNode;
  summaryClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const byHover = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canHover = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => (canHover.current = mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  function enter() {
    cancelClose();
    const d = ref.current;
    if (!canHover.current || !d || d.open) return;
    byHover.current = true;
    d.open = true;
  }

  function leave() {
    if (!byHover.current) return;
    cancelClose();
    timer.current = setTimeout(() => {
      if (byHover.current && ref.current) ref.current.open = false;
      byHover.current = false;
    }, 250);
  }

  return (
    <details ref={ref} className={className} onMouseLeave={leave} onMouseEnter={cancelClose}>
      <summary
        className={summaryClassName}
        onClick={(e) => {
          // Open from a hover: the click keeps it open rather than closing it.
          if (byHover.current) {
            e.preventDefault();
            byHover.current = false;
          }
        }}
      >
        <span onMouseEnter={enter}>{summary}</span>
      </summary>
      {children}
    </details>
  );
}

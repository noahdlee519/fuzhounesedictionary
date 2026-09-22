"use client";

import { useEffect, useRef, useState } from "react";

/* The site links on a phone: one row that scrolls sideways if it must. The
   fade at its right edge says "there is more" — so it is only drawn when
   there is more, not over a last link that fits (globals.css .nav-strip). */
export default function NavStrip({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollWidth - el.scrollLeft - el.clientWidth > 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, []);
  return (
    <nav ref={ref} aria-label="Site" data-more={more ? "" : undefined} className={className}>
      {children}
    </nav>
  );
}

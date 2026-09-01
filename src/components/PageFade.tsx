"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FADE_EVENT } from "./NavLink";

/* Fades in everything below the nav.

   The fade is a CSS animation on a wrapper that is re-keyed, rather than one
   started from an effect. That ordering matters: a keyed remount means the
   animation is already running at the first paint, so the new page never
   flashes at full opacity for a frame before dropping to zero.

   `nudge` covers the case a pathname cannot: clicking the link for the page you
   are already on. Nothing about the route changes, so the key needs another
   moving part.

   Opacity only — no movement. An earlier version of this drifted upward as well
   and that is what made the site feel templated. */
export default function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [nudge, setNudge] = useState(0);

  useEffect(() => {
    const bump = () => setNudge((n) => n + 1);
    window.addEventListener(FADE_EVENT, bump);
    return () => window.removeEventListener(FADE_EVENT, bump);
  }, []);

  return (
    <div key={`${pathname}#${nudge}`} className="page-fade">
      {children}
    </div>
  );
}

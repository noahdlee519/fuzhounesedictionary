"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/* A thin red bar across the top of the window while a page is on its way.

   Every page here is rendered on the server per request, so a click on a
   Browse filter or a sort, or a search, can take a second with nothing on
   screen to say it registered. This listens for exactly those moments — a
   click on a link to another page of this site, or a search form sent — and
   starts the bar; the new address arriving finishes it.

   It waits 120ms before showing, so a page that is already there never
   flashes a bar. It creeps towards 90% and never reaches the end on its own:
   the end is the page arriving. A safety timer clears it if the navigation is
   abandoned (a click that was cancelled, a download). */

const DELAY = 120;
const GIVE_UP = 15000;

export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    const start = () => {
      clear();
      timers.current.push(window.setTimeout(() => setState("running"), DELAY));
      timers.current.push(window.setTimeout(() => setState("idle"), GIVE_UP));
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, or only the #fragment changes: nothing to wait for.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      // GET forms navigate (the search boxes). Server Actions are POSTs and
      // carry their own pending state on their buttons.
      if (!form || e.defaultPrevented || (form.method || "get").toLowerCase() !== "get") return;
      start();
    };

    // Capture phase: Next's <Link> cancels the browser's own navigation in
    // its click handler, so by the time the event bubbled up here it would
    // look like a click that was called off.
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      clear();
    };
  }, []);

  // The new address has arrived: run the bar to the end and fade it out.
  useEffect(() => {
    clear();
    setState((s) => (s === "running" ? "done" : "idle"));
    timers.current.push(window.setTimeout(() => setState("idle"), 400));
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      className={
        "pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-lacquer " +
        (state === "running"
          ? "nav-progress-run opacity-100"
          : state === "done"
            ? "scale-x-100 opacity-0 [transition:transform_200ms_cubic-bezier(0.23,1,0.32,1),opacity_150ms_ease_200ms]"
            : "scale-x-0 opacity-0")
      }
    />
  );
}

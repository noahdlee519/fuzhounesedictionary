"use client";

import { useEffect, useState } from "react";

/* Light / dark switch. The page starts in whatever <html data-theme> the
   inline script in layout.tsx stamped (a stored choice, else the system
   preference); this reads that after mount, so the server and the first
   client paint agree, then flips the attribute and stores the choice. A
   real switch to a screen reader: role="switch" with aria-checked. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark === true}
      aria-label="Dark mode"
      onClick={toggle}
      disabled={dark === null}
      className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint transition-colors hover:text-lacquer disabled:opacity-60 ${className}`}
    >
      <span>{dark ? "Dark" : "Light"} mode</span>
      <span
        aria-hidden="true"
        className={
          "relative inline-block h-[18px] w-[32px] shrink-0 rounded-full border transition-colors " +
          (dark ? "border-lacquer bg-lacquer" : "border-ruleStrong bg-transparent")
        }
      >
        <span
          className={
            "absolute top-[2px] h-[12px] w-[12px] rounded-full transition-[left] " +
            (dark ? "left-[16px] bg-paper" : "left-[2px] bg-ink")
          }
        />
      </span>
    </button>
  );
}

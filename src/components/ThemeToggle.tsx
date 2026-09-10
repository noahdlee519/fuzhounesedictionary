"use client";

import { useEffect, useState } from "react";

/* Light / dark switch. The page starts in whatever <html data-theme> the
   inline script in layout.tsx stamped (a stored choice, else the system
   preference); this reads that after mount, so the server and the first
   client paint agree, then flips the attribute and stores the choice.

   Two faces: `icon` (the header — a round ghost button with a sun or moon)
   and the labelled switch used on the account page. */
export default function ThemeToggle({
  className = "",
  icon = false,
  label = "Dark mode",
}: {
  className?: string;
  icon?: boolean;
  label?: string;
}) {
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

  if (icon) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={dark === true}
        aria-label={label}
        title={label}
        onClick={toggle}
        disabled={dark === null}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ruleStrong text-inkSoft transition-colors hover:text-ink disabled:opacity-60 ${className}`}
      >
        {dark ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M13.5 9.8A6 6 0 0 1 6.2 2.5a6 6 0 1 0 7.3 7.3z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark === true}
      aria-label={label}
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

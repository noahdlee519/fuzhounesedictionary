"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROM_COOKIE, ROM_SYSTEMS, type RomSystem } from "@/lib/romanization";
import { useL } from "@/components/LangProvider";

/* Bàng-uâ-cê or Yngping (Noah, 25 Sep 2026). A small two-way switch that
   sets the reader's romanization for the whole site, remembered in a cookie
   like the language: words stored in BUC are shown in Yngping when that is
   chosen (lib/romanization). The page re-renders from the server so every
   word on it follows. */
export default function RomToggle({ sys, className = "" }: { sys: RomSystem; className?: string }) {
  const router = useRouter();
  const L = useL();
  const [busy, setBusy] = useState(false);
  const choose = (next: RomSystem) => {
    if (next === sys || busy) return;
    setBusy(true);
    document.cookie = `${ROM_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
    setTimeout(() => setBusy(false), 800);
  };
  return (
    <div
      role="group"
      aria-label={L("Romanization", "羅馬字")}
      className={`inline-flex h-7 overflow-hidden rounded-sm border border-ruleStrong align-middle ${className}`}
    >
      {ROM_SYSTEMS.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => choose(s.key)}
          aria-pressed={sys === s.key}
          title={s.key === "buc" ? L("Bàng-uâ-cê", "平話字") : L("Yngping", "榕拼")}
          className={
            "ui relative whitespace-nowrap px-2.5 text-xs font-semibold tracking-[.01em] transition-colors after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] " +
            (sys === s.key ? "bg-ink text-paper" : "text-inkSoft hover:text-ink")
          }
        >
          {s.short}
        </button>
      ))}
    </div>
  );
}

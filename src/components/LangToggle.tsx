"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/* EN / 中文. Two faces: both languages side by side on a phone, where the
   toggles have a row of their own, and from 922px up (lowered from 1024,
   Noah, 21 Sep 2026); between 768 and 922,
   where everything shares one row, one small pill naming the other language —
   the pair costs about forty pixels more, which there is the difference
   between a usable search box and a stub. */
export default function LangToggle({ lang, className = "" }: { lang: Lang; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const choose = (next: Lang) => {
    if (next === lang || busy) return;
    setBusy(true);
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
    setTimeout(() => setBusy(false), 800);
  };

  const btn = (v: Lang, label: string) => (
    <button
      type="button"
      onClick={() => choose(v)}
      aria-pressed={lang === v}
      lang={v === "zh" ? "zh-Hant" : "en"}
      className={
        "ui h-full whitespace-nowrap px-2 text-xs min-[400px]:px-2.5 font-semibold tracking-[.01em] transition-colors " +
        (lang === v ? "bg-ink text-paper" : "text-inkSoft hover:text-ink")
      }
    >
      {label}
    </button>
  );

  const other: Lang = lang === "zh" ? "en" : "zh";
  return (
    <>
      {/* Wide: both languages, the current one filled. */}
      <div role="group" aria-label="Language" className={`flex h-8 overflow-hidden rounded-sm border border-ruleStrong md:hidden min-[922px]:flex ${className}`}>
        {btn("en", "EN")}
        {btn("zh", "中文")}
      </div>
      {/* Narrow: one small pill naming the other language. */}
      <button
        type="button"
        onClick={() => choose(other)}
        lang={other === "zh" ? "zh-Hant" : "en"}
        aria-label={other === "zh" ? "切換到中文" : "Switch to English"}
        className={`tap-sq ui hidden h-8 items-center rounded-sm border border-ruleStrong px-2.5 text-xs font-semibold text-inkSoft transition-colors hover:text-ink md:inline-flex min-[922px]:hidden ${className}`}
      >
        {other === "zh" ? "中文" : "EN"}
      </button>
    </>
  );
}

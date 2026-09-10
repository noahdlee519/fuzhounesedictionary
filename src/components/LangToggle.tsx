"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/* EN / 中文, as a two-button pill. The choice is a cookie; the pages are
   dynamic, so a refresh re-renders the chrome in the other language. */
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
        "h-full whitespace-nowrap px-2.5 text-xs font-semibold tracking-[.01em] transition-colors " +
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
      <div role="group" aria-label="Language" className={`hidden h-8 overflow-hidden rounded-full border border-ruleStrong md:flex ${className}`}>
        {btn("en", "EN")}
        {btn("zh", "中文")}
      </div>
      {/* Narrow: one small pill naming the other language. */}
      <button
        type="button"
        onClick={() => choose(other)}
        lang={other === "zh" ? "zh-Hant" : "en"}
        aria-label={other === "zh" ? "切換到中文" : "Switch to English"}
        className={`inline-flex h-8 items-center rounded-full border border-ruleStrong px-2.5 text-xs font-semibold text-inkSoft transition-colors hover:text-ink md:hidden ${className}`}
      >
        {other === "zh" ? "中文" : "EN"}
      </button>
    </>
  );
}

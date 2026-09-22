"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/* EN / 中文. Two faces: both languages side by side on a phone, where the
   toggles have a row of their own, and from 922px up (lowered from 1024,
   Noah, 21 Sep 2026); between 768 and 922,
   where everything shares one row, one small pill naming the other language —
   the pair costs about forty pixels more, which there is the difference
   between a usable search box and a stub.

   Switching shows a toast: a red bar just under the header, in the same
   style as the notices on the account page, saying which language the site
   is now in (in that language). It waits for the switch to land: the click
   only remembers which language was asked for, and the toast appears when
   the server's re-render brings that language back as the `lang` prop, which
   can take a second. If the switch never arrives, no toast. It leaves by
   itself after a few seconds, or with its ×. Portalled to <body> so no ancestor can clip or offset it. */
const TOAST_MS = 3200;
export default function LangToggle({ lang, className = "" }: { lang: Lang; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // The toast: which language it announces, and where the header ends.
  const [toast, setToast] = useState<{ to: Lang; top: number } | null>(null);
  const [shown, setShown] = useState(false);
  const timers = useRef<number[]>([]);
  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clear, []);

  const hide = () => {
    clear();
    setShown(false);
    timers.current.push(window.setTimeout(() => setToast(null), 200));
  };

  const announce = (to: Lang) => {
    clear();
    const bottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    setToast({ to, top: Math.max(0, bottom) });
    setShown(false);
    // Mount hidden, then fade in on the next frame so the transition runs.
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    timers.current.push(window.setTimeout(hide, TOAST_MS));
  };

  // The language a click asked for, until the page arrives in it.
  const wanted = useRef<Lang | null>(null);
  useEffect(() => {
    if (wanted.current && wanted.current === lang) {
      wanted.current = null;
      announce(lang);
    }
    // Only when the language itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const choose = (next: Lang) => {
    if (next === lang || busy) return;
    setBusy(true);
    wanted.current = next;
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
      {toast &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 z-[45]" style={{ top: toast.top }}>
            <div className="wrap pt-3">
              <div
                role="status"
                lang={toast.to === "zh" ? "zh-Hant" : "en"}
                className={
                  "pointer-events-auto flex items-center gap-4 rounded-sm bg-lacquer px-5 py-3 text-paper transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none " +
                  (shown ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")
                }
              >
                <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
                  {toast.to === "zh" ? "已切換到中文" : "Switched to English"}
                </p>
                <button
                  type="button"
                  onClick={hide}
                  aria-label={toast.to === "zh" ? "關閉" : "Dismiss"}
                  className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-lg leading-none transition-colors hover:bg-white/15"
                >
                  ×
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
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

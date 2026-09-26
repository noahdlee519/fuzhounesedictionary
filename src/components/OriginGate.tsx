"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { saveOrigin } from "@/app/account/actions";
import OriginPlaceFields from "./OriginPlaceFields";
import { useL } from "./LangProvider";

/* Where someone's Fuzhounese is from is required (Noah, 26 Sep 2026).
   Fuzhounese changes from county to county, so every recording and word
   says where it comes from, and a contribution without that is half a
   record.

   Anyone signed in whose profile has no county or district gets this
   prompt, on whatever page they are on, before they can do anything else
   there. It cannot be dismissed, only answered, or left by signing out.
   It is not shown on the privacy policy and the terms, which someone may
   want to read before answering, or on the account page, which has the
   same fields.

   The layout says whether it is needed (needsOrigin). Components that save
   something on arrival — the recorder, with a take held across the sign-in
   — read useNeedsOrigin() and wait until it is false, which it becomes when
   the answer is saved and the page refreshes.

   The database refuses a contribution from an account with no origin as
   well (supabase/origin_required.sql), so this cannot be skipped by going
   around the page. */

const NeedsOrigin = createContext(false);

/** True while a signed-in person still has to say where their Fuzhounese is from. */
export function useNeedsOrigin() {
  return useContext(NeedsOrigin);
}

const EXEMPT = ["/privacy", "/terms", "/account"];

export default function OriginGate({ needsOrigin, children }: { needsOrigin: boolean; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const exempt = EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return (
    <NeedsOrigin.Provider value={needsOrigin}>
      {children}
      {needsOrigin && !exempt && <OriginPrompt />}
    </NeedsOrigin.Provider>
  );
}

function OriginPrompt() {
  const L = useL();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    const { ok } = await saveOrigin(new FormData(e.currentTarget)).catch(() => ({ ok: false }));
    if (!ok) {
      setFailed(true);
      setBusy(false);
      return;
    }
    // The layout renders again without the prompt, and anything waiting on
    // useNeedsOrigin() carries on.
    router.refresh();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="origin-prompt-title"
      // Escape would close it; this one is answered, not dismissed. A
      // browser may still close it (Chrome ignores preventDefault on an
      // Escape the page has had no click before), so it opens again.
      onCancel={(e) => e.preventDefault()}
      onClose={() => {
        if (!busy) dialog.current?.showModal();
      }}
      className="m-auto w-[min(92vw,520px)] rounded-sm border border-ruleStrong bg-paper p-0 text-ink shadow-[0_16px_48px_rgb(0_0_0/.25)] backdrop:bg-black/50"
    >
      <form onSubmit={submit} className="space-y-5 p-6 sm:p-7">
        <div className="space-y-2">
          <p className="meta text-inkFaint">{L("One question before you start", "開始之前，先問一個問題")}</p>
          <h2 id="origin-prompt-title" className="font-display text-2xl font-bold leading-tight tracking-tight">
            {L("Where is your Fuzhounese from?", "你的福州話來自哪裡？")}
          </h2>
          <p className="text-[15px] leading-snug text-inkSoft">
            {L(
              "Fuzhounese changes from county to county and village to village, so every recording and word here says where it comes from. Tell us once, and it goes with everything you contribute.",
              "福州話每個縣、每個村講法都不一樣，所以這裡的每段錄音、每個詞都會標明來自哪裡。告訴我們一次，你貢獻的所有內容都會附上。"
            )}
          </p>
        </div>

        <OriginPlaceFields area="" locality="" labelCls="field-label" inputCls="field-input" />

        <fieldset className="space-y-2">
          <legend className="field-label">{L("What may we show publicly?", "可以公開顯示哪些資訊？")}</legend>
          <label className="flex items-start gap-3">
            <input type="radio" name="origin_precision" value="area" defaultChecked className="mt-1.5 accent-lacquer" />
            <span className="text-sm">
              <span className="font-medium">{L("County or district only", "只顯示縣或區")}</span>
              <span className="block text-inkFaint">{L("e.g. “Changle 長樂”. The village is not stored.", "例如「Changle 長樂」。不儲存鄉鎮／村。")}</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="radio" name="origin_precision" value="locality" className="mt-1.5 accent-lacquer" />
            <span className="text-sm">
              <span className="font-medium">{L("County and village", "顯示縣／區和鄉鎮／村")}</span>
              <span className="block text-inkFaint">{L("e.g. “Jinfeng, Changle 長樂”.", "例如「Jinfeng, Changle 長樂」。")}</span>
            </span>
          </label>
        </fieldset>

        <p className="text-xs leading-snug text-inkFaint">
          {L("Shown on your profile and beside your recordings. You can change it on your account page at any time. ", "會顯示在你的個人頁面和你的錄音旁邊。你隨時可以在帳號頁面修改。")}
          <Link href="/privacy" className="underline hover:text-lacquer">
            {L("Privacy policy", "隱私權政策")}
          </Link>
        </p>

        {failed && (
          <p role="alert" className="text-sm text-lacquer">
            {L("That could not be saved just now. Please try again.", "目前無法儲存，請再試一次。")}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4">
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? L("Saving…", "儲存中…") : L("Save and continue", "儲存並繼續")}
          </button>
          <button
            type="submit"
            form="origin-prompt-signout"
            className="text-sm text-inkFaint transition-colors hover:text-lacquer"
          >
            {L("Not now? Sign out", "現在不想填？登出")}
          </button>
        </div>
      </form>
      {/* Its own form: a form cannot sit inside another. */}
      <form id="origin-prompt-signout" action="/auth/signout" method="post" className="hidden" />
    </dialog>
  );
}

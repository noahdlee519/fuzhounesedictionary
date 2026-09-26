"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sendEmailCode, startGoogleSignIn, verifyEmailCode, type SignInError } from "@/lib/supabase/sign-in";
import { useL } from "./LangProvider";

/* The sign-in dialog: Google, or a code by email (Noah, 26 Sep 2026 —
   Google is blocked in mainland China, and some of the people who speak
   Fuzhounese best are there).

   Opened by every sign-in button on the site (SignInButton) and by the
   recorder when someone chooses a take before signing in. Two steps for
   email: the address, then the code from the email. The email also carries
   a link, which signs in on whichever device opens it; the code is for
   reading the email on a phone and signing in on a computer, or the other
   way round.

   After a code is accepted the page loads again at `next`, so the server
   renders it signed in and anything held for the trip (a recording, an
   assistant question) is picked up exactly as it is after Google.

   Rendered into <body> through a portal: some buttons sit inside a <p>,
   where a <dialog> may not go. */

const RESEND_AFTER_S = 60;
const EMAIL_KEY = "fz:signin-email";

type Busy = "google" | "send" | "verify" | null;

export default function SignInDialog({
  open,
  onClose,
  next,
  intro,
}: {
  open: boolean;
  onClose: () => void;
  /** Where to land once signed in (a path on this site). */
  next: string;
  /** A line under the title saying why sign-in is asked for here. */
  intro?: string;
}) {
  const L = useL();
  const dialog = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<"choose" | "code">("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setMounted(true);
    try {
      const last = window.localStorage.getItem(EMAIL_KEY);
      if (last) setEmail(last);
    } catch {
      /* no remembered address; the field starts empty */
    }
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open, mounted]);

  // The resend countdown ticks only while there is one to show.
  const waitS = Math.max(0, RESEND_AFTER_S - Math.floor((now - sentAt) / 1000));
  useEffect(() => {
    if (stage !== "code" || waitS === 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [stage, waitS]);

  function explain(e: SignInError): string {
    const msg = e.message.toLowerCase();
    switch (e.code) {
      case "over_email_send_rate_limit":
        return L(
          "Too many sign-in emails have gone out in the last hour. Please try again later, or continue with Google.",
          "過去一小時寄出的登入郵件太多了。請稍後再試，或改用 Google 登入。"
        );
      case "over_request_rate_limit":
        return L("Please wait a minute before asking for another code.", "請等一分鐘再索取新的驗證碼。");
      case "email_address_invalid":
      case "validation_failed":
        return L("That email address doesn't look right.", "這個電子郵件地址好像不對。");
      case "otp_expired":
        return L(
          "That code is not right or has expired. Check it, or ask for a new one.",
          "驗證碼不正確或已過期。請再檢查一次，或索取新的驗證碼。"
        );
      case "email_address_not_authorized":
      case "email_provider_disabled":
      case "otp_disabled":
      case "signup_disabled":
        return L(
          "Signing in by email isn't available yet. Please continue with Google for now.",
          "目前還不能用電子郵件登入，請先使用 Google 登入。"
        );
    }
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("load failed")) {
      return L(
        "Couldn't reach the sign-in service. Check your connection and try again.",
        "無法連線到登入服務。請檢查網路連線後再試一次。"
      );
    }
    if (msg.includes("security purposes") || msg.includes("after")) {
      return L("Please wait a minute before asking for another code.", "請等一分鐘再索取新的驗證碼。");
    }
    if (msg.includes("expired") || msg.includes("invalid")) {
      return L(
        "That code is not right or has expired. Check it, or ask for a new one.",
        "驗證碼不正確或已過期。請再檢查一次，或索取新的驗證碼。"
      );
    }
    return e.message;
  }

  async function google() {
    setError(null);
    setBusy("google");
    const err = await startGoogleSignIn(next);
    // Reached only if the redirect to Google never happened.
    if (err) {
      setError(explain(err));
      setBusy(null);
    }
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(L("That email address doesn't look right.", "這個電子郵件地址好像不對。"));
      return;
    }
    setError(null);
    setBusy("send");
    const err = await sendEmailCode(address, next);
    setBusy(null);
    if (err) {
      setError(explain(err));
      return;
    }
    try {
      window.localStorage.setItem(EMAIL_KEY, address);
    } catch {
      /* only a convenience */
    }
    setEmail(address);
    setCode("");
    setSentAt(Date.now());
    setNow(Date.now());
    setStage("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError(L("Type the whole code from the email.", "請輸入郵件裡完整的驗證碼。"));
      return;
    }
    setError(null);
    setBusy("verify");
    const err = await verifyEmailCode(email.trim(), token);
    if (err) {
      setError(explain(err));
      setBusy(null);
      return;
    }
    // Signed in. Load `next` for real, so the server renders it signed in.
    const url = new URL(next, window.location.origin);
    const here = window.location.pathname + window.location.search;
    if (url.pathname + url.search === here) {
      if (url.hash && url.hash !== window.location.hash) window.location.hash = url.hash;
      window.location.reload();
    } else {
      window.location.assign(url.pathname + url.search + url.hash);
    }
  }

  if (!mounted) return null;

  const field =
    "w-full rounded-sm border border-ruleStrong bg-surface px-3 py-2.5 text-[16px] text-ink placeholder:text-inkFaint focus:border-ink focus:outline-none";

  return createPortal(
    <dialog
      ref={dialog}
      aria-label={L("Sign in", "登入")}
      onClose={onClose}
      // A click on the backdrop (the dialog element itself, outside its
      // panel) closes it, as Escape does.
      onClick={(e) => {
        if (e.target === dialog.current && !busy) dialog.current?.close();
      }}
      className="m-auto w-[min(92vw,400px)] rounded-sm border border-ruleStrong bg-paper p-0 text-ink shadow-[0_16px_48px_rgb(0_0_0/.25)] backdrop:bg-black/50"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <p className="meta text-inkFaint">{L("Sign in", "登入")}</p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={L("Close", "關閉")}
            className="-mr-2 grid h-8 w-8 place-items-center rounded-sm text-inkFaint transition-colors hover:text-ink"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
        </div>

        {stage === "choose" ? (
          <>
            <p className="mt-3 text-[15px] leading-snug text-inkSoft">
              {intro ??
                L(
                  "Sign in to contribute. There is no password: continue with Google, or we'll email you a code.",
                  "登入即可參與貢獻。不需要密碼：可以使用 Google 登入，或讓我們寄驗證碼到你的電子郵件。"
                )}
            </p>

            <button
              type="button"
              onClick={google}
              disabled={busy !== null}
              className="btn mt-5 w-full border-ruleStrong bg-surface text-ink hover:border-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
              </svg>
              {busy === "google" ? L("Opening Google…", "正在開啟 Google…") : L("Continue with Google", "使用 Google 登入")}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-inkFaint" aria-hidden>
              <span className="h-px flex-1 bg-rule" />
              {L("or by email", "或使用電子郵件")}
              <span className="h-px flex-1 bg-rule" />
            </div>

            <form onSubmit={send} className="space-y-3" noValidate>
              <label className="block">
                <span className="sr-only">{L("Email address", "電子郵件地址")}</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={L("you@example.com", "你的電子郵件地址")}
                  className={field}
                />
              </label>
              <button type="submit" disabled={busy !== null} className="btn btn-primary w-full">
                {busy === "send" ? L("Sending…", "寄送中…") : L("Email me a sign-in code", "寄登入驗證碼給我")}
              </button>
              <p className="text-xs leading-snug text-inkFaint">
                {L(
                  "Works without Google, including in mainland China. A new address gets a new account.",
                  "不需要 Google，在中國大陸也能使用。新的電子郵件地址會自動建立帳號。"
                )}
              </p>
            </form>
          </>
        ) : (
          <form onSubmit={verify} className="mt-3 space-y-4" noValidate>
            <p className="text-[15px] leading-snug text-inkSoft">
              {L("We sent a sign-in code to ", "我們已將登入驗證碼寄到 ")}
              <span className="break-all font-semibold text-ink">{email}</span>
              {L(
                ". Type it here, or open the link in the email.",
                "。請在這裡輸入驗證碼，或直接點郵件裡的連結。"
              )}
            </p>
            <label className="block">
              <span className="sr-only">{L("Code from the email", "郵件裡的驗證碼")}</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={10}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className={`${field} text-center font-ui text-2xl tracking-[0.3em] placeholder:tracking-[0.3em]`}
              />
            </label>
            <button type="submit" disabled={busy !== null} className="btn btn-primary w-full">
              {busy === "verify" ? L("Signing in…", "登入中…") : L("Sign in", "登入")}
            </button>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <button
                type="button"
                onClick={() => send()}
                disabled={busy !== null || waitS > 0}
                className="text-lacquer hover:underline disabled:text-inkFaint disabled:no-underline"
              >
                {waitS > 0
                  ? L("Send a new code in {s}s", "{s} 秒後可重新寄送", { s: waitS })
                  : L("Send a new code", "重新寄送驗證碼")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("choose");
                  setError(null);
                  setCode("");
                }}
                disabled={busy !== null}
                className="text-inkSoft hover:text-lacquer hover:underline"
              >
                {L("Use a different email", "改用其他電子郵件")}
              </button>
            </p>
            <p className="text-xs leading-snug text-inkFaint">
              {L(
                "Not there after a minute? Look in your spam or junk folder.",
                "一分鐘後還沒收到？請看看垃圾郵件匣。"
              )}
            </p>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-lacquer">
            {error}
          </p>
        )}
      </div>
    </dialog>,
    document.body
  );
}

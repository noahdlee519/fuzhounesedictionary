"use client";

import { useEffect, useRef, useState } from "react";
import SignInButton from "./SignInButton";
import { useL } from "@/components/LangProvider";

/* The thumbs as a signed-out visitor sees them: they look and feel like the
   real buttons (hover, press), a hover panel says a sign-in is needed, and
   pressing one opens a small box with the sign-in — rather than doing
   nothing, which reads as broken. */
export default function VoteSignIn({
  children,
  next,
  align = "right",
}: {
  children: React.ReactNode;
  next: string;
  /** Which edge the hint and the sign-in box line up with. */
  align?: "left" | "right";
}) {
  const L = useL();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <span ref={wrap} className="audio-tip-host relative inline-flex items-center gap-1" style={{ ["--btn" as any]: "44px" }}>
      <span onClickCapture={(e) => { e.preventDefault(); setOpen((o) => !o); }} className="inline-flex items-center gap-1">
        {children}
      </span>
      {!open && (
        <span role="tooltip" className={`audio-tip ${align === "left" ? "audio-tip-left" : "audio-tip-right"}`}>
          {L("Sign in to vote", "登入後即可投票")}
        </span>
      )}
      {open && (
        <span className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full z-30 mt-2 w-60 rounded-sm border border-ruleStrong bg-paper p-4 text-left shadow-[0_8px_28px_rgb(0_0_0/.12)]`}>
          <span className="block text-sm text-inkSoft">{L("Sign in to have your vote count.", "登入後你的投票才會算數。")}</span>
          <span className="mt-3 block">
            <SignInButton next={next} label={L("Sign in", "登入")} className="btn btn-primary btn-sm [&>svg]:hidden" />
          </span>
        </span>
      )}
    </span>
  );
}

"use client";

import { ASK_EVENT } from "./AskSection";

/* "Or ask the assistant ↓" under the home page's search box. It still goes
   down to the Ask section, and now takes along whatever was typed in the
   search box and asks it there (AskSection listens for ASK_EVENT). With
   nothing typed, it goes down and puts the cursor in the question box.
   Before, the typed words were left behind in the search box and the
   assistant waited, empty (Noah, 27 Oct 2026). */
export default function AskJump({ label, from = "site-search" }: { label: string; from?: string }) {
  return (
    <a
      href="#ask"
      onClick={() => {
        const el = document.getElementById(from) as HTMLInputElement | null;
        const q = (el?.value ?? "").trim();
        // After the jump, so the answer appears where the page has landed.
        setTimeout(() => window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: q })), 0);
      }}
      className="footnote ml-auto whitespace-nowrap px-1 text-lacquer underline-offset-2 hover:underline"
    >
      {label}
    </a>
  );
}

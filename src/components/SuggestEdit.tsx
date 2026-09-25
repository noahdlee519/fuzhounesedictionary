"use client";

import { useEffect, useRef, useState } from "react";
import SignInButton from "./SignInButton";
import SubmitButton from "./SubmitButton";
import { suggestEdit } from "@/app/entry/actions";
import { useL } from "./LangProvider";

/* "Suggest an edit" on a word page. It used to open the visitor's mail app,
   which most people abandon. Now it folds open a box right here: say what
   should change, send, and it waits in the review queue for an editor.
   Signed out, the box asks for a sign-in first — a suggestion is credited
   and an editor may need to ask about it. */
/* The value sent is always the English reason, so the review queue reads the
   same whichever language the reporter used; only the label is translated. */
const REASONS: [string, string][] = [
  ["Wrong or misleading", "錯誤或有誤導"],
  ["Offensive or inappropriate", "冒犯或不恰當"],
  ["Duplicate of another word", "和另一個詞重複"],
  ["Something else", "其他"],
];

/* Report works the same way: pick a reason, add a line if you like, and it
   goes to the same review queue as a 'report' (supabase/suggest_edit.sql). */
export default function SuggestEdit({
  entryId,
  signedIn,
  status,
  kind = "edit",
}: {
  entryId: string;
  signedIn: boolean;
  kind?: "edit" | "report";
  /** From the address after sending: "sent", "empty", or an error message. */
  status?: string;
}) {
  const L = useL();
  const [open, setOpen] = useState(Boolean(status && status !== "sent"));
  const sent = status === "sent";
  const report = kind === "report";
  const anchor = report ? "report" : "suggest";
  const problem =
    status && status !== "sent"
      ? status === "empty"
        ? report ? L("Please choose a reason.", "請選一個原因。") : L("Please say what should change.", "請說明要修改什麼。")
        : status
      : null;

  const wrap = useRef<HTMLDivElement>(null);
  // A popover: Escape or a click elsewhere closes it.
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

  if (sent) {
    return (
      <p id={anchor} role="status" className="meta text-lacquer">
        {report ? L("✓ Reported—thank you", "✓ 已檢舉，謝謝") : L("✓ Suggestion sent—thank you", "✓ 建議已送出，謝謝")}
      </p>
    );
  }

  return (
    <div id={anchor} ref={wrap} className="relative scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${anchor}-panel`}
        className={"meta transition-colors hover:text-lacquer " + (open ? "text-lacquer" : "text-inkFaint")}
      >
        {report ? L("Report", "檢舉") : L("Suggest an edit", "建議修改")} {open ? "▾" : "▸"}
      </button>
      {/* Drops down over the page from the link, lined up with its right
          edge on a wide screen (it sits at the right of the page) and its
          left edge on a phone. */}
      {open && (
        <div
          id={`${anchor}-panel`}
          className="absolute left-0 top-full z-30 mt-2 w-[min(26rem,calc(100vw-2.5rem))] rounded-sm border border-ruleStrong bg-paper p-5 text-left shadow-[0_8px_28px_rgb(0_0_0/.12)] sm:left-auto sm:right-0"
        >
          {signedIn ? (
            <form action={suggestEdit} className="space-y-3">
              <input type="hidden" name="entry_id" value={entryId} />
              <input type="hidden" name="kind" value={kind} />
              {report && (
                <fieldset className="space-y-1.5">
                  <legend className="field-label">{L("What is wrong with this word?", "這個詞有什麼問題？")}</legend>
                  {REASONS.map(([r, rZh], i) => (
                    <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                      <input type="radio" name="reason" value={r} required defaultChecked={i === 0} className="accent-[var(--lacquer)]" />
                      {L(r, rZh)}
                    </label>
                  ))}
                </fieldset>
              )}
              <label htmlFor={`${anchor}-value`} className={report ? "field-label !mt-4" : "field-label"}>
                {report
                  ? L("Anything the editor should know (optional)", "有什麼要讓編輯知道的嗎？（選填）")
                  : L("What should change, and why?", "要改什麼？為什麼？")}
              </label>
              <textarea
                id={`${anchor}-value`}
                name="value"
                required={!report}
                autoFocus={!report}
                maxLength={440}
                rows={report ? 2 : 3}
                placeholder={
                  report
                    ? L("e.g. This is the same word as 黃色.", "例如：這和「黃色」是同一個詞。")
                    : L(
                        "e.g. The romanization should be uòng, and it also means “a surname”.",
                        "例如：羅馬字應該是 uòng，另外也有「姓氏」的意思。"
                      )
                }
                className="field-input min-h-[64px] resize-y"
              />
              {problem && (
                <p role="alert" className="text-sm text-lacquer">
                  {problem}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <SubmitButton pending={L("Sending…", "送出中…")} className="btn btn-primary btn-sm">
                  {report ? L("Send report", "送出檢舉") : L("Send suggestion", "送出建議")}
                </SubmitButton>
                <span className="footnote">{report ? L("An editor will look at it.", "編輯會處理。") : L("An editor reads it before anything changes.", "編輯看過後才會修改。")}</span>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-inkSoft">
                {report
                  ? L("Sign in to report this word. An editor reads every report.", "登入後即可檢舉這個詞。每一則檢舉都有編輯閱讀。")
                  : L(
                      "Sign in to suggest an edit to this word. An editor reads every suggestion.",
                      "登入後即可建議修改這個詞。每一則建議都有編輯閱讀。"
                    )}
              </p>
              <SignInButton next={`/entry/${entryId}#${anchor}`} label={L("Sign in", "登入")} className="btn btn-primary btn-sm [&>svg]:hidden" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

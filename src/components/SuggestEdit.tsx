"use client";

import { useState } from "react";
import SignInButton from "./SignInButton";
import SubmitButton from "./SubmitButton";
import { suggestEdit } from "@/app/entry/actions";

/* "Suggest an edit" on a word page. It used to open the visitor's mail app,
   which most people abandon. Now it folds open a box right here: say what
   should change, send, and it waits in the review queue for an editor.
   Signed out, the box asks for a sign-in first — a suggestion is credited
   and an editor may need to ask about it. */
export default function SuggestEdit({
  entryId,
  signedIn,
  status,
}: {
  entryId: string;
  signedIn: boolean;
  /** From the address after sending: "sent", "empty", or an error message. */
  status?: string;
}) {
  const [open, setOpen] = useState(Boolean(status && status !== "sent"));
  const sent = status === "sent";
  const problem = status && status !== "sent" ? (status === "empty" ? "Please say what should change." : status) : null;

  if (sent) {
    return (
      <p id="suggest" role="status" className="meta text-lacquer">
        ✓ Suggestion sent—thank you. An editor will read it.
      </p>
    );
  }

  return (
    <div id="suggest" className="scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="meta text-inkFaint transition-colors hover:text-lacquer"
      >
        Suggest an edit {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="mt-3 w-full max-w-xl rounded-sm border border-rule bg-surface p-5">
          {signedIn ? (
            <form action={suggestEdit} className="space-y-3">
              <input type="hidden" name="entry_id" value={entryId} />
              <label htmlFor="suggest-value" className="field-label">
                What should change, and why?
              </label>
              <textarea
                id="suggest-value"
                name="value"
                required
                maxLength={500}
                rows={3}
                placeholder="e.g. The romanization should be uòng, and it also means “a surname”."
                className="field-input min-h-[88px] resize-y"
              />
              {problem && (
                <p role="alert" className="text-sm text-lacquer">
                  {problem}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <SubmitButton pending="Sending…" className="btn btn-primary btn-sm">
                  Send suggestion
                </SubmitButton>
                <span className="footnote">An editor reads it before anything changes.</span>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-inkSoft">Sign in to suggest an edit to this word. An editor reads every suggestion.</p>
              <SignInButton next={`/entry/${entryId}#suggest`} label="Sign in" className="btn btn-primary btn-sm [&>svg]:hidden" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

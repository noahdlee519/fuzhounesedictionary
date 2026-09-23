import { LEGAL_CONTACT as EDITOR_CONTACT } from "@/components/Legal";

/* The editor invitation on the account page (lib/approvals, editorInvite):
   the same red bar as "N of your edits were accepted", with a × that closes
   it for good. Presentational, so it can be shown with made-up numbers. */
export default function EditorInviteBanner({
  recordings,
  words,
  dismiss,
}: {
  recordings: number;
  words: number;
  /** The server action behind the ×. */
  dismiss?: (formData: FormData) => void | Promise<void>;
}) {
  // What they have done, in their terms: whichever crossed the line, or both.
  const parts = [
    recordings >= 1 ? `${recordings} recording${recordings === 1 ? "" : "s"}` : null,
    words >= 1 ? `${words} word${words === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  const done = parts.join(" and ");
  const mail = `mailto:${EDITOR_CONTACT}?subject=${encodeURIComponent("Becoming an editor")}`;

  return (
    <div role="status" className="flex items-start gap-4 rounded-sm bg-lacquer px-5 py-4 text-paper">
      <div className="min-w-0 flex-1 space-y-1.5 text-[15px] leading-snug">
        <p className="font-semibold">
          Thank you for {done ? `your ${done}` : "all you have added"}. Would you like to become an editor?
        </p>
        <p>
          An editor&apos;s contributions go live straight away, without waiting for review, and editors approve or
          turn down what others send in. If that sounds interesting, write to Noah at{" "}
          <a href={mail} className="whitespace-nowrap font-semibold underline underline-offset-2 hover:opacity-80">
            {EDITOR_CONTACT}
          </a>
          .
        </p>
      </div>
      <form action={dismiss}>
        <button
          type="submit"
          aria-label="Dismiss"
          className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-lg leading-none transition-colors hover:bg-white/15"
        >
          ×
        </button>
      </form>
    </div>
  );
}

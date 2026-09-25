import { LEGAL_CONTACT as EDITOR_CONTACT } from "@/components/Legal";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

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
  const L = pick(getLang());
  // What they have done, in their terms: whichever crossed the line, or both.
  const parts = [
    recordings >= 1
      ? recordings === 1
        ? L("1 recording", "1 段錄音")
        : L("{n} recordings", "{n} 段錄音", { n: recordings })
      : null,
    words >= 1 ? (words === 1 ? L("1 word", "1 個詞") : L("{n} words", "{n} 個詞", { n: words })) : null,
  ].filter(Boolean);
  const done = parts.join(L(" and ", "和"));
  const mail = `mailto:${EDITOR_CONTACT}?subject=${encodeURIComponent("Becoming an editor")}`;

  return (
    <div role="status" className="flex items-start gap-4 rounded-sm bg-lacquer px-5 py-4 text-paper">
      <div className="min-w-0 flex-1 space-y-1.5 text-[15px] leading-snug">
        <p className="font-semibold">
          {done
            ? L("Thank you for your {done}. Would you like to become an editor?", "謝謝你貢獻的{done}。你想成為編輯嗎？", { done })
            : L("Thank you for all you have added. Would you like to become an editor?", "謝謝你貢獻的一切。你想成為編輯嗎？")}
        </p>
        <p>
          {L(
            "An editor's contributions go live straight away, without waiting for review, and editors approve or turn down what others send in. If that sounds interesting, write to Noah at ",
            "編輯的貢獻不必等待審核，會直接刊出；編輯也負責核准或退回其他人的投稿。如果你有興趣，請寫信給 Noah："
          )}
          <a href={mail} className="whitespace-nowrap font-semibold underline underline-offset-2 hover:opacity-80">
            {EDITOR_CONTACT}
          </a>
          {L(".", "。")}
        </p>
      </div>
      <form action={dismiss}>
        <button
          type="submit"
          aria-label={L("Dismiss", "關閉")}
          className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-lg leading-none transition-colors hover:bg-white/15"
        >
          ×
        </button>
      </form>
    </div>
  );
}

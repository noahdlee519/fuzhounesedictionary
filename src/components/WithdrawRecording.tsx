import { withdrawRecordingForm } from "@/app/account/actions";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";
import SubmitButton from "./SubmitButton";

/* "Delete" on one of your own recordings, whatever its status (Noah,
   23 Sep 2026: anyone signed in can take down their own voice). The same
   no-JavaScript <details> confirmation as DeleteRecording. Shown on the
   account page and beside your own takes on a word's page. */
export default function WithdrawRecording({ id, back }: { id: string; back: string }) {
  const L = pick(getLang());
  return (
    <details className="group inline-block">
      <summary className="inline-block cursor-pointer list-none meta text-inkFaint transition-colors hover:text-lacquer group-open:text-lacquer [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
        <span className="group-open:hidden">{L("Delete", "刪除")}</span>
        <span className="hidden group-open:inline">{L("Cancel", "取消")}</span>
      </summary>
      <form action={withdrawRecordingForm} className="mt-1.5 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="back" value={back} />
        <span className="text-xs text-inkSoft">{L("Delete your recording? This can’t be undone.", "要刪除你的錄音嗎？刪除後無法復原。")}</span>
        <SubmitButton
          pending={L("Deleting…", "刪除中…")}
          className="rounded-sm border border-lacquer bg-lacquer px-2 py-0.5 meta text-paper transition-[color,background-color,border-color,transform] active:scale-[.97] hover:bg-transparent hover:text-lacquer disabled:opacity-60"
        >
          {L("Yes, delete", "確定刪除")}
        </SubmitButton>
      </form>
    </details>
  );
}

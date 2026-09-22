import { withdrawRecordingForm } from "@/app/account/actions";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";
import SubmitButton from "./SubmitButton";

/* "Remove" on one of your own recordings that is still waiting for review:
   the same no-JavaScript <details> confirmation as DeleteRecording. */
export default function WithdrawRecording({ id, back }: { id: string; back: string }) {
  const L = pick(getLang());
  return (
    <details className="group inline-block">
      <summary className="inline-block cursor-pointer list-none meta text-inkFaint transition-colors hover:text-lacquer group-open:text-lacquer [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
        <span className="group-open:hidden">{L("Remove", "移除")}</span>
        <span className="hidden group-open:inline">{L("Cancel", "取消")}</span>
      </summary>
      <form action={withdrawRecordingForm} className="mt-1.5 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="back" value={back} />
        <span className="text-xs text-inkSoft">{L("Remove this recording before anyone hears it?", "要在刊出前移除這段錄音嗎？")}</span>
        <SubmitButton
          pending={L("Removing…", "移除中…")}
          className="border border-lacquer bg-lacquer px-2 py-0.5 meta text-paper transition-[color,background-color,border-color,transform] active:scale-[.97] hover:bg-transparent hover:text-lacquer disabled:opacity-60"
        >
          {L("Yes, remove", "確定移除")}
        </SubmitButton>
      </form>
    </details>
  );
}

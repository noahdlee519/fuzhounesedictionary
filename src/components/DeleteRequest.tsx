import { deleteRequest } from "@/app/request/actions";
import SubmitButton from "./SubmitButton";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

/* Editors only: a small "Delete" beside a requested word that asks once
   before it acts — the same no-JavaScript <details> confirmation as
   DeleteRecording. */
export default function DeleteRequest({ id, back, className = "" }: { id: string; back: string; className?: string }) {
  const L = pick(getLang());
  return (
    <details className={`group relative shrink-0 ${className}`}>
      <summary className="-my-1 cursor-pointer list-none rounded-sm px-1.5 py-1 meta text-inkFaint transition-colors hover:text-lacquer group-open:text-lacquer [&::-webkit-details-marker]:hidden">
        {L("Delete", "刪除")}
      </summary>
      <form
        action={deleteRequest}
        className="absolute right-0 top-full z-30 mt-1 w-56 space-y-2 rounded-sm border border-ruleStrong bg-paper p-3 text-left shadow-[0_8px_28px_rgb(0_0_0/.12)]"
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="back" value={back} />
        <p className="text-sm text-ink">{L("Delete this request and its votes?", "刪除這個請求和它的票數？")}</p>
        <SubmitButton pending={L("Deleting…", "刪除中…")} className="btn btn-primary btn-sm">
          {L("Delete request", "刪除請求")}
        </SubmitButton>
      </form>
    </details>
  );
}

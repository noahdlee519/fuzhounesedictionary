import { deleteEntry } from "@/app/admin/actions";
import SubmitButton from "./SubmitButton";

/* An editor's control for removing a whole word.

   Same no-JavaScript <details> confirmation as DeleteRecording, but the text
   spells out what goes with it, because everything hanging off the entry —
   meanings, every recording, suggestions, requests — goes too. */
export default function DeleteEntry({
  id,
  back,
  className = "",
}: {
  id: string;
  /** Where to go afterwards. Never the entry itself; it will 404. */
  back: string;
  className?: string;
}) {
  return (
    <details className={`group inline-block ${className}`}>
      <summary className="inline-block cursor-pointer list-none border border-rule px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-inkFaint transition-colors hover:border-lacquer hover:text-lacquer group-open:border-lacquer group-open:text-lacquer [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
        Delete word
      </summary>
      <form action={deleteEntry} className="mt-2 max-w-md space-y-2 border border-lacquer bg-surface p-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="back" value={back} />
        <p className="text-sm text-ink">
          Remove this word from the dictionary for good? Its meanings, every recording of it, and
          any suggestions or requests for it go with it. This cannot be undone.
        </p>
        <SubmitButton
          pending="Deleting…"
          className="border border-lacquer bg-lacquer px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-paper transition-colors hover:bg-transparent hover:text-lacquer disabled:opacity-60"
        >
          Yes, delete this word
        </SubmitButton>
      </form>
    </details>
  );
}

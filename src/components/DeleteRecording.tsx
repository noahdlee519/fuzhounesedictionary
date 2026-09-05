import { deleteRecording } from "@/app/admin/actions";
import SubmitButton from "./SubmitButton";

/* An editor's delete control for one recording.

   Built on <details>/<summary> so the confirmation needs no JavaScript and no
   browser dialog: "Delete" opens a one-line "Really?" with the real button
   inside it. Rendered only for editors (the caller checks); the server action
   checks again, and RLS would refuse anyone else regardless. */
export default function DeleteRecording({
  id,
  back,
  className = "",
}: {
  id: string;
  /** Path to return to after deleting — the entry page or the queue. */
  back: string;
  className?: string;
}) {
  return (
    <details className={`group inline-block ${className}`}>
      <summary className="inline-block cursor-pointer list-none border border-rule px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-inkFaint transition-colors hover:border-lacquer hover:text-lacquer group-open:border-lacquer group-open:text-lacquer [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
        Delete
      </summary>
      <form action={deleteRecording} className="mt-1.5 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="back" value={back} />
        <span className="text-xs text-inkSoft">Remove this recording for good?</span>
        <SubmitButton
          pending="Deleting…"
          className="border border-lacquer bg-lacquer px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-paper transition-colors hover:bg-transparent hover:text-lacquer disabled:opacity-60"
        >
          Yes, delete
        </SubmitButton>
      </form>
    </details>
  );
}

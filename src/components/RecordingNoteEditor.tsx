import { saveRecordingNote } from "@/app/account/actions";
import { MAX_RECORDING_NOTE } from "@/lib/constants";
import SubmitButton from "./SubmitButton";

/* Add or change the note on one of your own recordings, in place.

   A <details> that shows the note (or "no note") with an add/edit toggle and,
   opened, a one-line form. Used on the account page and on the entry page for
   recordings the viewer made. Posts to saveRecordingNote, which runs as the
   signed-in user: RLS limits it to their own rows and a trigger keeps every
   column but the note unchanged (supabase/recording_note.sql). */
export default function RecordingNoteEditor({
  id,
  note,
  back,
  compact = false,
}: {
  id: string;
  note: string | null | undefined;
  /** Path to return to after saving; the page the form is on. */
  back: string;
  compact?: boolean;
}) {
  const text = (note ?? "").trim();
  return (
    <details className={`group ${compact ? "" : "mt-2"}`}>
      <summary className="inline-flex cursor-pointer list-none items-baseline gap-2 text-sm marker:content-none [&::-webkit-details-marker]:hidden">
        {text ? (
          <span className="romanization text-inkSoft">{text}</span>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">no note</span>
        )}
        <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint group-hover:text-lacquer group-open:text-lacquer">
          {text ? "edit" : "+ add a note"}
        </span>
      </summary>
      <form action={saveRecordingNote} className="mt-2 flex max-w-md flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="back" value={back} />
        <label htmlFor={`note-${id}`} className="sr-only">Note</label>
        <input
          id={`note-${id}`}
          name="note"
          defaultValue={text}
          maxLength={MAX_RECORDING_NOTE}
          placeholder="e.g. a sentence you said it in, or how it is used"
          className="grow border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
        />
        <SubmitButton
          pending="Saving…"
          className="border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer disabled:opacity-60"
        >
          Save note
        </SubmitButton>
      </form>
    </details>
  );
}

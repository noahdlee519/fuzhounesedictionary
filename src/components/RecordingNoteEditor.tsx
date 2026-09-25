import { saveRecordingNote } from "@/app/account/actions";
import { MAX_RECORDING_NOTE } from "@/lib/constants";
import SubmitButton from "./SubmitButton";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

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
  const L = pick(getLang());
  const text = (note ?? "").trim();
  return (
    <details className={`group ${compact ? "" : "mt-2"}`}>
      <summary className="inline-flex cursor-pointer list-none items-baseline gap-2 text-sm marker:content-none [&::-webkit-details-marker]:hidden">
        {text ? (
          <span className="romanization text-inkSoft">{text}</span>
        ) : (
          <span className="meta text-inkFaint">{L("no note", "沒有附註")}</span>
        )}
        <span className="meta text-inkFaint group-hover:text-lacquer group-open:text-lacquer">
          {text ? L("edit", "修改") : L("+ add a note", "+ 加上附註")}
        </span>
      </summary>
      <form action={saveRecordingNote} className="mt-2 flex max-w-md flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="back" value={back} />
        <label htmlFor={`note-${id}`} className="sr-only">{L("Note", "附註")}</label>
        <input
          id={`note-${id}`}
          name="note"
          defaultValue={text}
          maxLength={MAX_RECORDING_NOTE}
          placeholder={L("e.g. a sentence you said it in, or how it is used", "例如：你用這個詞講的一句話，或它的用法")}
          className="rounded-sm grow border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
        />
        <SubmitButton
          pending={L("Saving…", "儲存中…")}
          className="rounded-sm border border-rule px-3 py-1.5 meta text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer disabled:opacity-60"
        >
          {L("Save note", "儲存附註")}
        </SubmitButton>
      </form>
    </details>
  );
}

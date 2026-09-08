import Link from "next/link";
import { formatOrigin } from "@/lib/origins";
import DeleteRecording from "./DeleteRecording";
import RecordingNoteEditor from "./RecordingNoteEditor";
import VoteButtons, { type VoteState } from "./VoteButtons";

/* One player per recording, labelled with who said it and where their
   Fuzhounese is from. This is the point of the recordings table: the same word
   said in Changle and in Gulou are both correct and both worth hearing. */

export interface RecordingRow {
  id: string;
  kind: string;
  sense_id: string | null;
  audio_url: string;
  status: string;
  note?: string | null;
  origin_area: string | null;
  origin_locality: string | null;
  created_at: string;
  contributor?: { id: string; display_name: string | null } | null;
}

export default function RecordingList({
  recordings,
  compact = false,
  canDelete = false,
  back,
  viewerId,
  votes,
}: {
  recordings: RecordingRow[];
  compact?: boolean;
  /** Editors get a delete control on every row. */
  canDelete?: boolean;
  /** Where the delete and note actions return to; the entry page, normally. */
  back?: string;
  /** The signed-in viewer: their own rows get an add/edit-note control. */
  viewerId?: string | null;
  /** Thumbs up/down counts and the viewer's own vote, by recording id. */
  votes?: Map<string, VoteState>;
}) {
  if (!recordings.length) return null;

  return (
    <ul className={compact ? "space-y-1.5" : "space-y-2"}>
      {recordings.map((r) => {
        const origin = formatOrigin(r.origin_area, r.origin_locality);
        const who = r.contributor?.display_name;
        const note = (r.note ?? "").trim();
        const mine = Boolean(viewerId && r.contributor?.id === viewerId);
        return (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <audio
              controls
              src={r.audio_url}
              className={compact ? "h-8 max-w-[15rem]" : "h-9 w-full max-w-sm"}
            />
            <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">
              {origin ? (
                <Link
                  href={`/learn?origin=${encodeURIComponent(r.origin_area!)}`}
                  className="hover:text-lacquer"
                >
                  {origin}
                </Link>
              ) : (
                "origin not given"
              )}
              {who && r.contributor?.id && (
                <>
                  {" · "}
                  <Link href={`/contributor/${r.contributor.id}`} className="hover:text-lacquer">
                    {who}
                  </Link>
                </>
              )}
              {r.status !== "approved" && (
                <span className="ml-2 border border-rule px-1.5 py-0.5 text-inkFaint">
                  {r.status === "pending" ? "awaiting review" : r.status}
                </span>
              )}
            </span>
            {votes && (
              <VoteButtons
                id={r.id}
                state={votes.get(r.id) ?? { up: 0, down: 0, mine: null }}
                back={back ?? "/"}
                signedIn={Boolean(viewerId)}
              />
            )}
            {canDelete && <DeleteRecording id={r.id} back={back ?? "/admin"} />}
            {/* The speaker's own line about the take — the sentence they read,
                or how they would put it. Sits under the player, full width.
                On your own recording it is editable in place. */}
            {mine ? (
              <div className="basis-full">
                <RecordingNoteEditor id={r.id} note={note} back={back ?? "/account?show=recordings"} compact />
              </div>
            ) : (
              note && (
                <p className="basis-full text-sm text-inkSoft">
                  <span className="romanization">{note}</span>
                </p>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}

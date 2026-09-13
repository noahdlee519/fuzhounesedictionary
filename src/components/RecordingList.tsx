import Link from "next/link";
import { formatOrigin } from "@/lib/origins";
import DeleteRecording from "./DeleteRecording";
import PlayButton from "./PlayButton";
import RecordingNoteEditor from "./RecordingNoteEditor";
import VoteButtons, { type VoteState } from "./VoteButtons";

/* One row per recording: a play button, the speaker's note, who recorded it and
   where their Fuzhounese is from, and the thumbs. This is the point of the recordings table: the same word
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
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {recordings.map((r) => {
        const origin = formatOrigin(r.origin_area, r.origin_locality);
        const who = r.contributor?.display_name;
        const note = (r.note ?? "").trim();
        const mine = Boolean(viewerId && r.contributor?.id === viewerId);
        const label = `${note || (r.kind === "example" ? "example sentence" : "the word")}${who ? `, recorded by ${who}` : ""}`;
        return (
          <li key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <div className="pt-0.5">
              <PlayButton src={r.audio_url} label={label} size={compact ? "sm" : "md"} />
            </div>

            <div className="min-w-[11rem] flex-1 space-y-1">
              {/* The speaker's line about the take — the sentence they read,
                  or how they would put it. On your own recording it is
                  editable in place; with no note there is nothing here at all,
                  and the note is added from the account page instead. */}
              {mine && note ? (
                <RecordingNoteEditor id={r.id} note={note} back={back ?? "/account?show=recordings"} compact />
              ) : (
                note && <p className="romanization text-[15px] leading-snug text-ink">{note}</p>
              )}
              <p className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">
                {who && r.contributor?.id ? (
                  <>
                    recorded by{" "}
                    <Link href={`/contributor/${r.contributor.id}`} className="hover:text-lacquer">
                      {who}
                    </Link>
                  </>
                ) : (
                  "recorded by a contributor"
                )}
                {origin && (
                  <>
                    {" · "}
                    <Link
                      href={`/browse?origin=${encodeURIComponent(r.origin_area!)}`}
                      className="hover:text-lacquer"
                    >
                      {origin}
                    </Link>
                  </>
                )}
                {r.status !== "approved" && (
                  <span className="ml-2 inline-block whitespace-nowrap border border-rule px-1.5 py-0.5 text-inkFaint">
                    {r.status === "pending" ? "awaiting review" : r.status}
                  </span>
                )}
              </p>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2 pt-0.5">
              {votes && (
                <VoteButtons
                  id={r.id}
                  state={votes.get(r.id) ?? { up: 0, down: 0, mine: null }}
                  back={back ?? "/"}
                  signedIn={Boolean(viewerId)}
                />
              )}
              {canDelete && <DeleteRecording id={r.id} back={back ?? "/admin"} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

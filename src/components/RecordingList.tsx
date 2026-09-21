import Link from "next/link";
import { formatOrigin } from "@/lib/origins";
import DeleteRecording from "./DeleteRecording";
import OriginMap from "./OriginMap";
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
  /** Someone other than the contributor, speaking (recording_speaker.sql). */
  speaker_name?: string | null;
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
  fallback,
}: {
  recordings: RecordingRow[];
  /** Shown in place of a note on a recording that has none: the word's
   *  English meaning (or, for a sentence, its translation), so every row says
   *  what is being said. Display only — the note itself stays empty, and the
   *  speaker can still write one. */
  fallback?: string | null;
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
        const speaker = (r.speaker_name ?? "").trim();
        const label = `${note || (r.kind === "example" ? "example sentence" : "the word")}${speaker ? `, said by ${speaker}` : ""}${who ? `, recorded by ${who}` : ""}`;
        return (
          <li key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <div className="pt-0.5">
              <PlayButton src={r.audio_url} label={label} size={compact ? "sm" : "md"} />
            </div>

            <div className="min-w-[11rem] flex-1 space-y-1">
              {/* The speaker's line about the take — the sentence they read,
                  or how they would put it. On your own recording it is
                  editable in place. With no note, the word's English meaning
                  stands in (Noah, 21 Sep 2026), and a note is still added
                  from the account page. */}
              {mine && note ? (
                <RecordingNoteEditor id={r.id} note={note} back={back ?? "/account?show=recordings"} compact />
              ) : note ? (
                <p className="romanization text-[15px] leading-snug text-ink">{note}</p>
              ) : (
                fallback?.trim() && <p className="text-[15px] leading-snug text-ink">{fallback.trim()}</p>
              )}
              <p className="meta text-inkFaint">
                {/* Someone else speaking comes first: it is their voice and
                    their district; the account holder made the recording. */}
                {speaker && <span className="text-inkSoft">said by {speaker} · </span>}
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

            <div className="ml-auto flex shrink-0 items-center gap-3 pt-0.5">
              {/* Where this speaker's Fuzhounese is from, as a map. The word
                  is the same word; the point of having several takes is that
                  they come from different places. */}
              <OriginMap code={r.origin_area} className={compact ? "!h-7 !w-7" : ""} />
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

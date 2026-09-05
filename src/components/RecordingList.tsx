import Link from "next/link";
import { formatOrigin } from "@/lib/origins";
import DeleteRecording from "./DeleteRecording";

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
}: {
  recordings: RecordingRow[];
  compact?: boolean;
  /** Editors get a delete control on every row. */
  canDelete?: boolean;
  /** Where the delete action returns to; the entry page, normally. */
  back?: string;
}) {
  if (!recordings.length) return null;

  return (
    <ul className={compact ? "space-y-1.5" : "space-y-2"}>
      {recordings.map((r) => {
        const origin = formatOrigin(r.origin_area, r.origin_locality);
        const who = r.contributor?.display_name;
        const note = (r.note ?? "").trim();
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
            {canDelete && <DeleteRecording id={r.id} back={back ?? "/admin"} />}
            {/* The speaker's own line about the take — the sentence they read,
                or how they would put it. Sits under the player, full width. */}
            {note && (
              <p className="basis-full text-sm text-inkSoft">
                <span className="romanization">{note}</span>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

import Link from "next/link";
import { STATUS_STYLE } from "@/lib/status";
import { sortSenses } from "@/lib/entries";

/* One recording in a person's list — on their public profile and on their own
   account page. Reads: word · its first English meaning · the player · (status,
   on the owner's page). A sentence recording says so after the meaning. The
   entry link is only offered when the entry itself is live; a pending word has
   no page yet. */

export interface RecordingByRowProps {
  id: string;
  kind: string;
  audio_url: string;
  status: string;
  note?: string | null;
  created_at: string;
  entry: {
    id: string;
    headword: string;
    hanzi: string | null;
    romanization: string | null;
    status: string;
    senses?: { definition_en: string | null; sort: number | null }[] | null;
  } | null;
}


export default function RecordingByRow({
  recording: r,
  showStatus = false,
}: {
  recording: RecordingByRowProps;
  showStatus?: boolean;
}) {
  const w = r.entry;
  const name = w?.romanization || w?.headword || "a word";
  const meaning = sortSenses(w?.senses).find((s) => s.definition_en)?.definition_en;
  const title = (
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {w?.hanzi && <span className="font-display text-xl font-bold">{w.hanzi}</span>}
      <span className="romanization font-display font-semibold text-lacquer">{name}</span>
      {meaning && <span className="text-sm text-inkFaint">{meaning}</span>}
      {r.kind === "example" && (
        <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">in a sentence</span>
      )}
    </span>
  );

  return (
    <div className="border border-rule bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {w && w.status === "approved" ? (
          <Link href={`/entry/${w.id}`} className="hover:underline">
            {title}
          </Link>
        ) : (
          title
        )}
        {showStatus && (
          <span
            className={`ml-auto font-mono text-[11px] uppercase tracking-wide ring-1 px-2 py-0.5 ${STATUS_STYLE[r.status] ?? STATUS_STYLE.pending}`}
          >
            {r.status}
          </span>
        )}
      </div>
      <audio controls src={r.audio_url} className="mt-2 h-9 w-full max-w-sm" />
      {r.note?.trim() && <p className="romanization mt-2 text-sm text-inkSoft">{r.note.trim()}</p>}
    </div>
  );
}

import Link from "next/link";

/* One recording in a person's list — on their public profile and on their own
   account page. Reads: word · what was said · the player · (status, if not
   approved). The entry link is only offered when the entry itself is live;
   a pending word has no page yet. */

export interface RecordingByRowProps {
  id: string;
  kind: string;
  audio_url: string;
  status: string;
  created_at: string;
  entry: {
    id: string;
    headword: string;
    hanzi: string | null;
    romanization: string | null;
    status: string;
  } | null;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "text-amber-700 ring-amber-600/40 dark:text-amber-300",
  approved: "text-lacquer ring-lacquer",
  rejected: "text-inkFaint ring-rule",
};

export default function RecordingByRow({
  recording: r,
  showStatus = false,
}: {
  recording: RecordingByRowProps;
  showStatus?: boolean;
}) {
  const w = r.entry;
  const name = w?.romanization || w?.headword || "a word";
  const title = (
    <span className="flex items-baseline gap-3">
      {w?.hanzi && <span className="font-display text-xl font-bold">{w.hanzi}</span>}
      <span className="romanization font-display font-semibold text-lacquer">{name}</span>
      <span className="text-sm text-inkFaint">{r.kind === "example" ? "in a sentence" : "the word"}</span>
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
    </div>
  );
}

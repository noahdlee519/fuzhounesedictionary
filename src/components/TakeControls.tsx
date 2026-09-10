"use client";

import PlayButton from "./PlayButton";
import type { Take } from "./useRecorder";

/* The three faces of a recorder: idle (a Record button), recording (Stop and
   a running clock), and a take waiting (play it back, keep it or do it
   again). What "keep" does is up to the parent — save now, or hold it until
   the form is sent. */

export const recBtn =
  "inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors disabled:opacity-50";

export default function TakeControls({
  recording,
  take,
  seconds,
  error,
  onStart,
  onStop,
  onDiscard,
  /** Label for the take's play button, for screen readers. */
  playLabel = "your recording",
  /** Rendered after the play button while a take is waiting (Keep / Use this). */
  keep,
  /** Wording on the idle button. */
  recordLabel = "Record",
  disabled = false,
}: {
  recording: boolean;
  take: Take | null;
  seconds: number;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onDiscard: () => void;
  playLabel?: string;
  keep?: React.ReactNode;
  recordLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!take && !recording && (
          <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            className={`${recBtn} border-lacquer bg-lacquer text-paper hover:bg-transparent hover:text-lacquer`}
          >
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-current" />
            {recordLabel}
          </button>
        )}

        {recording && (
          <>
            <button type="button" onClick={onStop} className={`${recBtn} border-lacquer text-lacquer`}>
              <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse bg-current" />
              Stop
            </button>
            <span aria-live="polite" className="font-mono text-xs tabular-nums text-lacquer">
              {seconds.toFixed(1)}s
            </span>
          </>
        )}

        {take && !recording && (
          <>
            <PlayButton src={take.url} label={playLabel} />
            {keep}
            <button
              type="button"
              onClick={onDiscard}
              disabled={disabled}
              className={`${recBtn} border-rule text-inkSoft hover:border-lacquer hover:text-lacquer`}
            >
              Record again
            </button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-lacquer">{error}</p>}
    </div>
  );
}

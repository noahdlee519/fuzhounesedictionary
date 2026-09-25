"use client";

import PlayButton from "./PlayButton";
import type { Take } from "./useRecorder";
import { useL } from "./LangProvider";

/* The three faces of a recorder: idle (a Record button), recording (Stop and
   a running clock), and a take waiting (play it back, keep it or do it
   again). What "keep" does is up to the parent — save now, or hold it until
   the form is sent. */

export const recBtn =
  "rounded-sm inline-flex items-center gap-2 border px-3 py-1.5 meta transition-[color,background-color,border-color,transform] active:scale-[.97] disabled:opacity-50";

export default function TakeControls({
  recording,
  take,
  seconds,
  error,
  onStart,
  onStop,
  onDiscard,
  /** Label for the take's play button, for screen readers. */
  playLabel,
  /** Rendered after the play button while a take is waiting (Keep / Use this). */
  keep,
  /** Wording on the idle button. */
  recordLabel,
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
  const L = useL();
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
            {recordLabel ?? L("Record", "錄音")}
          </button>
        )}

        {recording && (
          <>
            <button type="button" onClick={onStop} className={`${recBtn} border-lacquer text-lacquer`}>
              <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse bg-current" />
              {L("Stop", "停止")}
            </button>
            <span aria-live="polite" className="text-xs tabular-nums text-lacquer">
              {L("{n}s", "{n} 秒", { n: seconds.toFixed(1) })}
            </span>
          </>
        )}

        {take && !recording && (
          <>
            <PlayButton src={take.url} label={playLabel ?? L("your recording", "你的錄音")} />
            {keep}
            <button
              type="button"
              onClick={onDiscard}
              disabled={disabled}
              className={`${recBtn} border-rule text-inkSoft hover:border-lacquer hover:text-lacquer`}
            >
              {L("Record again", "重錄")}
            </button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-lacquer">{error}</p>}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/* One round button that plays a recording.

   Four sizes: `lg` (72px, the entry page's audio hero), `md` (56px, the
   word cards on Browse), `sm` (44px, lists) and `xs` (36px, dense rows). All
   of them are the red disc with a white glyph — Noah's call, 10 Sep 2026;
   the outlined xs was dropped. The triangle becomes a square while the clip
   plays. Starting one clip stops any other on the page, so two takes of the
   same word never overlap. */

export default function PlayButton({
  src,
  label,
  size = "sm",
  className = "",
  showDuration = false,
}: {
  src: string;
  /** What is being played, for screen readers: "Play 厝 chuó, read by Mei". */
  label: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  /** Print the clip's length beside the button. */
  showDuration?: boolean;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    a.src = src;
    audio.current = a;
    const onMeta = () => setDuration(isFinite(a.duration) ? a.duration : null);
    const onEnd = () => setPlaying(false);
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onErr = () => setFailed(true);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    a.addEventListener("error", onErr);
    return () => {
      a.pause();
      a.removeAttribute("src");
      a.load();
      audio.current = null;
    };
  }, [src]);

  useEffect(() => {
    const onOther = (e: Event) => {
      const a = audio.current;
      if (a && (e as CustomEvent).detail !== a && !a.paused) a.pause();
    };
    window.addEventListener("fz:play", onOther);
    return () => window.removeEventListener("fz:play", onOther);
  }, []);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (playing) {
      a.pause();
      return;
    }
    window.dispatchEvent(new CustomEvent("fz:play", { detail: a }));
    a.currentTime = 0;
    a.play().catch(() => setFailed(true));
  }

  const s = size;
  const box =
    s === "lg" ? "h-[72px] w-[72px]" : s === "md" ? "h-14 w-14" : s === "sm" ? "h-11 w-11" : "h-9 w-9";
  const glyph = s === "lg" ? 26 : s === "md" ? 20 : s === "sm" ? 15 : 12;
  const nudge = s === "lg" ? "ml-[3px]" : s === "xs" ? "ml-[1px]" : "ml-[2px]";

  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={failed}
        aria-label={playing ? `Pause: ${label}` : `Play: ${label}`}
        aria-pressed={playing}
        title={failed ? "This recording could not be loaded" : undefined}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-lacquer text-white transition-[transform,opacity] hover:opacity-90 active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-40 ${box}`}
      >
        {playing ? (
          <svg width={glyph} height={glyph} viewBox="0 0 12 12" aria-hidden="true">
            <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width={glyph} height={glyph} viewBox="0 0 12 12" aria-hidden="true" className={nudge}>
            <path d="M2.5 1.2 11 6l-8.5 4.8z" fill="currentColor" />
          </svg>
        )}
      </button>
      {showDuration && duration !== null && (
        <span className="font-mono text-xs tabular-nums text-inkSoft">{fmt(duration)}</span>
      )}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/* A map you can look at closer. The cursor is a magnifier with a plus;
   a click zooms in around the point you clicked, a second click (or
   Escape) zooms back out. Works from the keyboard too — it is a button. */
export default function ZoomMap({
  src,
  alt,
  width,
  height,
  scale = 2.6,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  scale?: number;
}) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!origin) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOrigin(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [origin]);

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    if (origin) {
      setOrigin(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    // A keyboard "click" has no position; zoom around the centre.
    const x = e.clientX ? ((e.clientX - r.left) / r.width) * 100 : 50;
    const y = e.clientY ? ((e.clientY - r.top) / r.height) * 100 : 50;
    setOrigin({ x, y });
  }

  return (
    <button
      ref={box}
      type="button"
      onClick={toggle}
      aria-pressed={Boolean(origin)}
      aria-label={origin ? "Zoom out of the map" : "Zoom in on the map"}
      className={`block w-full overflow-hidden rounded-none border-0 bg-transparent p-0 text-left ${origin ? "cursor-zoom-out" : "cursor-zoom-in"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="block w-full transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={
          origin
            ? { transform: `scale(${scale})`, transformOrigin: `${origin.x}% ${origin.y}%` }
            : undefined
        }
      />
    </button>
  );
}

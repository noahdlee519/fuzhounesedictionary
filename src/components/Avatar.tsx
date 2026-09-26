"use client";

import { useEffect, useRef, useState } from "react";

/* A round profile picture. Shows the uploaded image if there is one; otherwise
   a generated default — the person's first initial on a lacquer disc, falling
   back to a neutral silhouette when there is no name to take an initial from.
   Plain <img> (not next/image) so Supabase/Google avatar URLs need no config.
   A picture that will not load falls back to the initial too: a Google
   profile picture is served from Google, which mainland China blocks, and
   there it was a broken-image icon (Noah, 26 Sep 2026). */
export default function Avatar({
  src,
  name,
  size = 32,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const box = { width: size, height: size };
  const initial = (name ?? "").trim().charAt(0).toUpperCase();
  const [broken, setBroken] = useState<string | null>(null);
  // An image that failed before the page hydrated fired its error event
  // with no one listening; catch that case on mount.
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = img.current;
    if (src && el && el.complete && el.naturalWidth === 0) setBroken(src);
  }, [src]);

  if (src && broken !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={img}
        src={src}
        alt={name ? `${name}'s profile picture` : "Profile picture"}
        width={size}
        height={size}
        style={box}
        className={`shrink-0 rounded-full object-cover ${className}`}
        onError={() => setBroken(src)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ ...box, fontSize: Math.round(size * 0.42) }}
      className={`grid shrink-0 select-none place-items-center rounded-full bg-lacquer font-display font-semibold leading-none text-paper ${className}`}
    >
      {initial || (
        <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6z" />
        </svg>
      )}
    </span>
  );
}

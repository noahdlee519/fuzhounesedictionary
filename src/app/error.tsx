"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">Error</p>
      <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
        Something went wrong
      </h1>
      <p className="text-inkSoft">
        This page could not be loaded. Please try again in a moment.
      </p>
      <p className="flex flex-wrap justify-center gap-5 pt-2 font-mono text-xs uppercase tracking-[0.1em]">
        <button onClick={reset} className="text-lacquer hover:underline">Try again</button>
        <Link href="/" className="text-lacquer hover:underline">Back to search</Link>
      </p>
    </div>
  );
}

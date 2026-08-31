import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">404</p>
      <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
        Not found
      </h1>
      <p className="text-inkSoft">
        That page or word is not here. It may have been removed, or the link may be wrong.
      </p>
      <p className="flex flex-wrap justify-center gap-5 pt-2 font-mono text-xs uppercase tracking-[0.1em]">
        <Link href="/" className="text-lacquer hover:underline">Search the dictionary</Link>
        <Link href="/learn" className="text-lacquer hover:underline">Browse all words</Link>
      </p>
    </div>
  );
}

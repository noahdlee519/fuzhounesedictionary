import type { Metadata } from "next";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
};

/* The 404. Fuzhounese has a word for "there is not", so the page uses it:
   無 mò̤, one of the dictionary's own entries. Then a search box, since the
   likeliest reason to be here is a word that moved or a mistyped link. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      <div className="space-y-4 border-b border-rule pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">404 · Not found</p>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="font-display text-7xl font-extrabold leading-none" lang="zh-Hant">無</span>
          <span className="romanization font-display text-3xl font-semibold text-lacquer">mò̤</span>
        </div>
        <p className="text-lg text-inkSoft">
          <span className="font-mono text-xs uppercase tracking-wider text-inkFaint">verb </span>
          to not have; there is not. The page you asked for is not here: it may have been removed,
          or the link may be wrong.
        </p>
      </div>

      <div className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Try a search instead</p>
        <SearchBar focus={false} assistant={false} id="lost-search" />
      </div>

      <p className="flex flex-wrap gap-5 font-mono text-xs uppercase tracking-[0.1em]">
        <Link href="/" className="text-lacquer hover:underline">Home</Link>
        <Link href="/browse" className="text-lacquer hover:underline">Browse all words</Link>
        <Link href="/request" className="text-lacquer hover:underline">Request a word</Link>
      </p>
    </div>
  );
}

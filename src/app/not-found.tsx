import type { Metadata } from "next";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

export function generateMetadata(): Metadata {
  const L = pick(getLang());
  return {
    title: L("Not found", "找不到頁面"),
    robots: { index: false, follow: true },
  };
}

/* The 404. Fuzhounese has a word for "there is not", so the page uses it:
   無 mò̤, one of the dictionary's own entries. Then a search box, since the
   likeliest reason to be here is a word that moved or a mistyped link. */
export default function NotFound() {
  const L = pick(getLang());
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      <div className="space-y-4 border-b border-rule pb-6">
        <p className="meta text-lacquer">{L("404 · Not found", "404 · 找不到頁面")}</p>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="font-display text-7xl font-extrabold leading-none" lang="zh-Hant">無</span>
          <span className="romanization font-display text-3xl font-semibold text-lacquer">mò̤</span>
        </div>
        <p className="text-lg text-inkSoft">
          <span className="meta text-inkFaint">{L("verb ", "動詞 ")}</span>
          {L(
            "to not have; there is not. The page you asked for is not here: it may have been removed, or the link may be wrong.",
            "沒有；不存在。你要找的頁面不在這裡：可能已被移除，或是連結有誤。"
          )}
        </p>
      </div>

      <div className="space-y-3">
        <p className="meta text-inkFaint">{L("Try a search instead", "改用搜尋試試")}</p>
        <SearchBar focus={false} assistant={false} id="lost-search" />
      </div>

      <p className="flex flex-wrap gap-5 meta">
        <Link href="/" className="text-lacquer hover:underline">{L("Home", "首頁")}</Link>
        <Link href="/browse" className="text-lacquer hover:underline">{L("Browse all words", "瀏覽所有詞條")}</Link>
        <Link href="/request" className="text-lacquer hover:underline">{L("Request a word", "請求詞條")}</Link>
      </p>
    </div>
  );
}

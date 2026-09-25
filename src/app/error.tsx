"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useL } from "@/components/LangProvider";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const L = useL();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg space-y-4 py-10">
      <p className="meta text-lacquer">{L("Error", "錯誤")}</p>
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        {L("Something went wrong", "出了點問題")}
      </h1>
      <p className="text-inkSoft">
        {L("This page could not be loaded. Please try again in a moment.", "無法載入這個頁面，請稍後再試。")}
      </p>
      <p className="flex flex-wrap justify-center gap-5 pt-2 meta">
        <button onClick={reset} className="text-lacquer hover:underline">{L("Try again", "再試一次")}</button>
        <Link href="/" className="text-lacquer hover:underline">{L("Back to search", "回到搜尋")}</Link>
      </p>
    </div>
  );
}

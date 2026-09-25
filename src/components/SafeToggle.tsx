"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SAFE_COOKIE } from "@/lib/content-filter";
import { useL } from "./LangProvider";

/* The content filter switch, in the same labelled-switch shape as the theme
   one. Unlike the theme, this changes what the server sends — the word list
   and the search results are filtered in the database — so the choice is a
   cookie and the page is refreshed rather than flipped client-side. The
   server hands in the current value, so there is nothing to read after
   mount and no flash of the wrong state. */
export default function SafeToggle({
  on,
  className = "",
  label: labelProp,
}: {
  on: boolean;
  className?: string;
  label?: string;
}) {
  const L = useL();
  const label = labelProp ?? L("Content filter", "內容過濾");
  const router = useRouter();
  const [safe, setSafe] = useState(on);

  const toggle = () => {
    const next = !safe;
    setSafe(next);
    document.cookie = `${SAFE_COOKIE}=${next ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={safe}
      aria-label={label}
      title={L(
        "Hide vulgar and explicit meanings from the word list and search results. Words reached on purpose still show everything.",
        "在詞表和搜尋結果中隱藏粗俗和露骨的意思。特地打開的詞條仍會顯示全部內容。"
      )}
      onClick={toggle}
      className={`inline-flex items-center gap-2 meta text-inkFaint transition-colors hover:text-lacquer ${className}`}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={
          "relative inline-block h-[18px] w-[32px] shrink-0 rounded-full border transition-colors " +
          (safe ? "border-lacquer bg-lacquer" : "border-ruleStrong bg-transparent")
        }
      >
        <span
          className={
            "absolute left-[2px] top-[2px] h-[12px] w-[12px] rounded-full transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] " +
            (safe ? "translate-x-[14px] bg-paper" : "translate-x-0 bg-ink")
          }
        />
      </span>
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { INVITE_RECORDINGS } from "@/lib/invite";
import { useL } from "./LangProvider";

/* "That's your 4th recording." Shown just after a save (Noah, 11 Oct 2026):
   nothing told people how much they had added, and the invitation to become
   an editor at INVITE_RECORDINGS arrived out of nowhere. Counts this person's
   recordings that are not rejected — RLS lets them read their own rows,
   pending ones included — so the number matches what the invitation counts
   (lib/approvals editorInvite). Shows nothing until the count arrives, or if
   it cannot be had. */

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

export default function RecordingTally({ userId, isEditor = false }: { userId: string; isEditor?: boolean }) {
  const L = useL();
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    createClient()
      .from("recordings")
      .select("id", { count: "exact", head: true })
      .eq("contributor_id", userId)
      .neq("status", "rejected")
      .then(({ count, error }) => {
        if (live && !error && count) setN(count);
      });
    return () => {
      live = false;
    };
  }, [userId]);

  /* The line's room is kept from the start, empty until the count arrives
     (about half a second), so it does not push "Next word" and the Record
     button down just as someone goes to tap them (audit, 11 Oct 2026). Two
     lines on a phone, one from sm up — what the text takes. */
  const box = "min-h-[2.5rem] text-sm text-inkSoft sm:min-h-[1.25rem]";
  if (!n) return <p className={box} aria-hidden />;
  const left = INVITE_RECORDINGS - n;
  return (
    <p className={box} role="status">
      {n === 1
        ? L("That's your first recording on the site. Thank you!", "這是你在網站上的第一段錄音，謝謝你！")
        : L("That's your {nth} recording. Thank you!", "這是你的第 {n} 段錄音，謝謝你！", { nth: ordinal(n), n })}
      {!isEditor && left > 0 && (
        <span className="text-inkFaint">
          {" "}
          {left === 1
            ? L("One more and we'll invite you to help as an editor.", "再錄 1 段，我們就會邀請你擔任編輯。")
            : L("{k} more and we'll invite you to help as an editor.", "再錄 {k} 段，我們就會邀請你擔任編輯。", { k: left })}
        </span>
      )}
    </p>
  );
}

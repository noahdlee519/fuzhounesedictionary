"use client";

import { useEffect, useState, useTransition } from "react";
import { voteRequest } from "@/app/request/actions";
import VoteSignIn from "./VoteSignIn";
import { useL } from "@/components/LangProvider";

/* The ▲ count beside a requested word. Pressing it adds your vote; pressing
   it again takes the vote back. The count and the colour change the moment
   it is pressed; the server action runs behind it and the page's data
   refreshes in the background (the action revalidates the pages with a
   request list and, called like this, does not redirect). Server actions
   from one page run one after another, and the action toggles against what
   is stored, so quick repeated presses still end where the last press left
   them. Signed out, it explains that a sign-in is needed. */
export default function RequestVote({
  id,
  votes,
  voted,
  signedIn,
  back,
  label,
  tall = false,
}: {
  id: string;
  votes: number;
  voted: boolean;
  signedIn: boolean;
  /** Where to come back to after signing in. */
  back: string;
  /** For screen readers: "3 votes". */
  label: string;
  /** The Request page's larger, stacked button. */
  tall?: boolean;
}) {
  const L = useL();
  const [mine, setMine] = useState(voted);
  const [count, setCount] = useState(votes);
  const [, startTransition] = useTransition();
  // After taking a vote back, the pointer is still over the button, and the
  // hover style (the same pink as "voted") made it look still selected. So
  // hover is off until the pointer leaves.
  const [cooling, setCooling] = useState(false);
  // When fresh data arrives from the server, it wins.
  useEffect(() => {
    setMine(voted);
    setCount(votes);
  }, [voted, votes]);

  const cls =
    (tall
      ? "flex w-14 flex-col items-center rounded-sm border px-2 py-1 leading-tight "
      : "inline-flex h-9 min-w-[52px] items-center justify-center gap-1 rounded-sm border px-2 text-xs ") +
    "tabular-nums transition-[color,background-color,border-color,transform] active:scale-[.95] " +
    (mine
      ? "border-lacquer bg-accentSoft text-lacquer"
      : cooling
        ? "border-ruleStrong text-inkSoft"
        : "border-ruleStrong text-inkSoft hover:border-lacquer hover:bg-accentSoft hover:text-lacquer");
  const inner = tall ? (
    <>
      <span aria-hidden className="text-base leading-none">▲</span>
      <span className="text-sm font-medium">{count}</span>
    </>
  ) : (
    <>
      <span aria-hidden>▲</span> {count}
    </>
  );

  if (!signedIn) {
    return (
      <VoteSignIn next={back} align="left">
        <button type="button" className={cls} aria-label={L("{label}. Sign in to vote", "{label}。登入後即可投票", { label })}>
          {inner}
        </button>
      </VoteSignIn>
    );
  }

  function toggle() {
    const next = !mine;
    setMine(next);
    setCooling(!next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => {
      voteRequest(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      onPointerLeave={() => setCooling(false)}
      className={cls}
      aria-pressed={mine}
      aria-label={
        mine
          ? L("{label}. You voted for this. Press again to remove your vote", "{label}。你已投票，再按一次可取消", { label })
          : L("{label}. Vote for this word", "{label}。替這個詞投票", { label })
      }
      title={mine ? L("You voted for this · click to undo", "你已投票 · 點一下取消") : L("Vote for this word", "替這個詞投票")}
    >
      {inner}
    </button>
  );
}

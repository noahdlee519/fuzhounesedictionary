import { voteRecording } from "@/app/entry/actions";
import SubmitButton from "./SubmitButton";
import VoteSignIn from "./VoteSignIn";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

export interface VoteState {
  up: number;
  down: number;
  /** The viewer's own vote, if any. */
  mine: 1 | -1 | null;
}

/* Thumbs up and down with counts. Two tiny forms, so they work without
   JavaScript and disable themselves while a vote is in flight. Signed-out
   visitors see the counts and a hint; the buttons do nothing for them.

   The question the thumbs ask is about the pronunciation, not the word:
   "Sounds right to me" / "Sounds different where I'm from". That wording is
   the tooltip and the screen-reader label, so a thumbs-down is an invitation
   to record your own variant rather than a verdict on the speaker. */
export default function VoteButtons({
  id,
  state,
  back,
  signedIn,
}: {
  id: string;
  state: VoteState;
  back: string;
  signedIn: boolean;
}) {
  const L = pick(getLang());
  /* A drawn thumb rather than the emoji: an emoji is set by the visitor's
     platform, so it changes colour and shape from phone to laptop and sits
     oddly beside a serif. This one is a single stroke in the current colour
     and flips for the down vote. */
  const thumb = (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M2.5 7h2.3v6.5H2.5zM4.8 7.6 8 2.2c.5-.9 1.9-.6 1.9.5V6h2.7c1 0 1.7.9 1.5 1.9l-.9 4.4c-.2.7-.8 1.2-1.5 1.2H4.8" />
    </svg>
  );
  const btn = (value: 1 | -1, glyph: string, label: string, n: number) => {
    const active = state.mine === value;
    const cls =
      "inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[13px] tabular-nums transition-[color,background-color,border-color,transform] duration-150 active:scale-[.93] disabled:cursor-not-allowed disabled:active:scale-100 " +
      (active
        ? "border-lacquer bg-lacquer text-paper hover:opacity-90"
        : "border-rule text-inkFaint hover:border-lacquer hover:bg-accentSoft hover:text-lacquer disabled:opacity-60");
    if (!signedIn) {
      // Looks and presses like the real thing; VoteSignIn (around both)
      // explains that a sign-in is needed.
      return (
        <button type="button" className={cls} aria-label={L("{n}: {label}. Sign in to vote", "{n}：{label}。登入後即可投票", { n, label })}>
          <span aria-hidden="true" className={glyph === "down" ? "scale-y-[-1]" : ""}>{thumb}</span> {n}
        </button>
      );
    }
    return (
      <form action={voteRecording} className="inline">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="value" value={value} />
        <input type="hidden" name="back" value={back} />
        <SubmitButton pending="…" className={cls} aria-pressed={active} title={active ? L("Withdraw: {label}", "收回：{label}", { label }) : label}>
          <span aria-hidden="true" className={glyph === "down" ? "scale-y-[-1]" : ""}>{thumb}</span> {n}
          <span className="sr-only">{label}</span>
        </SubmitButton>
      </form>
    );
  };
  const pair = (
    <span className="inline-flex items-center gap-1">
      {btn(1, "up", L("Sounds right to me", "聽起來沒錯"), state.up)}
      {btn(-1, "down", L("Sounds different where I'm from", "我那裡的講法不一樣"), state.down)}
    </span>
  );
  return signedIn ? pair : <VoteSignIn next={back}>{pair}</VoteSignIn>;
}

import { voteRecording } from "@/app/entry/actions";
import SubmitButton from "./SubmitButton";

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
      "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[13px] tabular-nums transition-[color,background-color,border-color,transform] active:scale-[.95] disabled:cursor-not-allowed disabled:active:scale-100 " +
      (active
        ? "border-lacquer bg-lacquer text-paper"
        : "border-rule text-inkFaint hover:border-lacquer hover:text-lacquer disabled:opacity-60 disabled:hover:border-rule disabled:hover:text-inkFaint");
    if (!signedIn) {
      return (
        <span className={cls.replace("hover:border-lacquer hover:text-lacquer", "")} title="Sign in to vote" aria-label={`${n} ${label}`}>
          <span aria-hidden="true" className={glyph === "down" ? "scale-y-[-1]" : ""}>{thumb}</span> {n}
        </span>
      );
    }
    return (
      <form action={voteRecording} className="inline">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="value" value={value} />
        <input type="hidden" name="back" value={back} />
        <SubmitButton pending="…" className={cls} aria-pressed={active} title={active ? `Withdraw: ${label}` : label}>
          <span aria-hidden="true" className={glyph === "down" ? "scale-y-[-1]" : ""}>{thumb}</span> {n}
          <span className="sr-only">{label}</span>
        </SubmitButton>
      </form>
    );
  };
  return (
    <span className="inline-flex items-center gap-1">
      {btn(1, "up", "Sounds right to me", state.up)}
      {btn(-1, "down", "Sounds different where I'm from", state.down)}
    </span>
  );
}

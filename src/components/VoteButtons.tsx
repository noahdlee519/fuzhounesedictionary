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
   visitors see the counts and a hint; the buttons do nothing for them. */
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
  const btn = (value: 1 | -1, glyph: string, label: string, n: number) => {
    const active = state.mine === value;
    const cls =
      "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[11px] tabular-nums transition-colors disabled:cursor-not-allowed " +
      (active
        ? "border-lacquer bg-lacquer text-paper"
        : "border-rule text-inkFaint hover:border-lacquer hover:text-lacquer disabled:opacity-60 disabled:hover:border-rule disabled:hover:text-inkFaint");
    if (!signedIn) {
      return (
        <span className={cls.replace("hover:border-lacquer hover:text-lacquer", "")} title="Sign in to vote" aria-label={`${n} ${label}`}>
          <span aria-hidden="true">{glyph}</span> {n}
        </span>
      );
    }
    return (
      <form action={voteRecording} className="inline">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="value" value={value} />
        <input type="hidden" name="back" value={back} />
        <SubmitButton pending="…" className={cls} aria-pressed={active} title={active ? `Withdraw your ${label}` : label}>
          <span aria-hidden="true">{glyph}</span> {n}
          <span className="sr-only">{label}</span>
        </SubmitButton>
      </form>
    );
  };
  return (
    <span className="inline-flex items-center gap-1">
      {btn(1, "👍", "thumbs up", state.up)}
      {btn(-1, "👎", "thumbs down", state.down)}
    </span>
  );
}

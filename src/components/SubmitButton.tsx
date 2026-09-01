"use client";

import { useFormStatus } from "react-dom";

/* A submit button that knows when its form is in flight.

   Every form on the site posts to a Server Action, and a round trip takes long
   enough that a second click is natural. Most actions are idempotent, but
   "request a word" is not: two clicks meant two inserts racing for the same
   unique index, and the loser saw a generic failure. Disabling the button
   while the request is out removes the race at the source. */
export default function SubmitButton({
  children,
  pending: pendingLabel,
  className,
}: {
  children: React.ReactNode;
  /** Label while the form is submitting. Defaults to the normal label. */
  pending?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingLabel ?? children : children}
    </button>
  );
}

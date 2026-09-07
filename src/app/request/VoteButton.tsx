"use client";

import { useFormStatus } from "react-dom";

/* The upvote arrow. Disabled while its form is in flight (a double click used
   to post twice) and when the viewer is signed out, in which case it is only a
   hint that signing in unlocks it. */
export default function VoteButton({
  locked,
  title,
  className,
  children,
}: {
  locked: boolean;
  title: string;
  className: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={locked || pending}
      aria-busy={pending}
      className={className + (pending ? " opacity-60" : "")}
    >
      {children}
    </button>
  );
}

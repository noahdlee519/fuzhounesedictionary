import { getSessionUser } from "@/lib/auth";
import { reviewCount } from "@/lib/review";

/* The red count of what is waiting for review, for editors only, beside a
   Contribute link: the footer's (the header draws its own, inside the
   links row). Renders nothing for everyone else, or when the queue is empty. */
export default async function ReviewBadge({ className = "" }: { className?: string }) {
  const { profile } = await getSessionUser();
  if (!profile?.is_editor) return null;
  const waiting = await reviewCount().catch(() => 0);
  if (waiting <= 0) return null;
  return (
    <span
      className={`inline-block min-w-[18px] rounded-full bg-lacquer px-1 text-center text-[10px] font-bold leading-[18px] tabular-nums text-white ${className}`}
      aria-label={`${waiting} waiting for review`}
    >
      {waiting > 99 ? "99+" : waiting}
    </span>
  );
}

import Link from "next/link";
import Avatar from "./Avatar";
import type { ContributorHit } from "@/lib/contributors";

/* A person in search results: picture, name, where their Fuzhounese is from
   (if they chose to say), and how much they have published. */
export default function ContributorCard({ c }: { c: ContributorHit }) {
  const name = c.display_name || "A contributor";
  const parts = [
    c.words ? `${c.words} word${c.words === 1 ? "" : "s"}` : null,
    c.recordings ? `${c.recordings} recording${c.recordings === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return (
    <Link
      href={`/contributor/${c.id}`}
      className="flex items-center gap-3 border border-rule bg-surface px-4 py-3 transition-colors hover:border-lacquer"
    >
      <Avatar src={c.avatar_url} name={c.display_name} size={36} className="ring-1 ring-rule" />
      <span className="min-w-0">
        <span className="block truncate font-display font-semibold text-ink">{name}</span>
        <span className="block truncate font-mono text-[11px] uppercase tracking-wide text-inkFaint">
          {[c.origin, parts.join(" · ")].filter(Boolean).join(" · ")}
        </span>
      </span>
    </Link>
  );
}

import Link from "next/link";
import Avatar from "./Avatar";
import type { ContributorHit } from "@/lib/contributors";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

/* A person in search results: picture, name, where their Fuzhounese is from
   (if they chose to say), and how much they have published. */
export default function ContributorCard({ c }: { c: ContributorHit }) {
  const L = pick(getLang());
  const name = c.display_name || L("A contributor", "一位貢獻者");
  const parts = [
    c.words ? (c.words === 1 ? L("1 word", "1 個詞") : L("{n} words", "{n} 個詞", { n: c.words })) : null,
    c.recordings
      ? c.recordings === 1
        ? L("1 recording", "1 段錄音")
        : L("{n} recordings", "{n} 段錄音", { n: c.recordings })
      : null,
  ].filter(Boolean);
  return (
    <Link
      href={`/contributor/${c.id}`}
      className="rounded-sm flex items-center gap-3 border border-rule bg-surface px-4 py-3 transition-colors hover:border-lacquer"
    >
      <Avatar src={c.avatar_url} name={c.display_name} size={36} className="ring-1 ring-rule" />
      <span className="min-w-0">
        <span className="block truncate font-display font-semibold text-ink">{name}</span>
        <span className="block truncate meta text-inkFaint">
          {[c.origin, parts.join(" · ")].filter(Boolean).join(" · ")}
        </span>
      </span>
    </Link>
  );
}

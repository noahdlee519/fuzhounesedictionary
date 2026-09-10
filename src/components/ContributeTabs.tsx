import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { translator, type Key } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* One place to contribute, four ways in.

   Adding a word, filling gaps in existing words, asking for words that are
   missing, and (for editors) reviewing what others sent were four pages with
   four names in the header. They are the same activity from four angles, so
   they share this masthead: the title "Contribute", then a tab for each,
   with Overview leading back to the hub at /contribute. The routes are
   unchanged — /submit, /improve, /request, /admin — only the way in is one.
   The Review tab carries the number of items waiting, so an editor sees at
   a glance whether there is anything to do. */

export type ContributeTab = "add" | "improve" | "wanted" | "review";

const TABS: { key: ContributeTab | "overview"; href: string; label: Key }[] = [
  { key: "overview", href: "/contribute", label: "tab.overview" },
  { key: "add", href: "/submit", label: "tab.add" },
  { key: "improve", href: "/improve", label: "tab.improve" },
  { key: "wanted", href: "/request", label: "tab.wanted" },
  { key: "review", href: "/admin", label: "tab.review" },
];

async function reviewCount(): Promise<number | null> {
  const supabase = createClient();
  const head = (table: string) =>
    supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
  const results = await Promise.all([head("entries"), head("recordings"), head("suggestions")]);
  // A queue whose table is missing (a migration not yet run) counts as empty.
  return results.reduce((n, r) => n + (r.error ? 0 : r.count ?? 0), 0);
}

export default async function ContributeTabs({ active }: { active: ContributeTab }) {
  const t = translator(getLang());
  const { profile } = await getSessionUser();
  const editor = Boolean(profile?.is_editor);
  const waiting = editor ? await reviewCount() : null;
  const tabs = TABS.filter((tab) => tab.key !== "review" || editor);

  return (
    <div className="border-b border-rule">
      <h1 className="h1">
        <Link href="/contribute" className="transition-colors hover:text-lacquer">
          {t("nav.contribute")}
        </Link>
      </h1>
      <nav aria-label="Ways to contribute" className="-mb-px mt-7 flex gap-x-6 overflow-x-auto whitespace-nowrap">
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={
                "inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-medium transition-colors " +
                (on ? "border-lacquer text-ink" : "border-transparent text-inkSoft hover:border-rule hover:text-ink")
              }
            >
              {t(tab.label)}
              {tab.key === "review" && waiting !== null && waiting > 0 && (
                <span
                  className={
                    "min-w-[1.25rem] rounded-full px-1.5 text-center font-mono text-[11px] leading-[18px] tabular-nums " +
                    (on ? "bg-lacquer text-paper" : "border border-ruleStrong text-inkSoft")
                  }
                  aria-label={t("tab.waiting", { n: waiting })}
                >
                  {waiting}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

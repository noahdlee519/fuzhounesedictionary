import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pending: "text-amber-700 ring-amber-600/40 dark:text-amber-300",
  approved: "text-lacquer ring-lacquer",
  rejected: "text-inkFaint ring-rule",
};

export default async function AccountPage() {
  const { user, profile } = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">My submissions</h1>
        <p className="text-inkSoft">Sign in to see the words you&apos;ve contributed.</p>
        <div className="flex justify-center"><SignInButton next="/account" /></div>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("entries")
    .select("id, headword, hanzi, romanization, status, review_notes, created_at, senses(definition_en, sort)")
    .eq("contributor_id", user.id)
    .order("created_at", { ascending: false });

  const entries = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-rule pb-4">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">My submissions</h1>
        <span className="font-mono text-xs uppercase tracking-wider text-inkFaint">{profile?.display_name}</span>
      </div>

      {entries.length === 0 ? (
        <div className="border border-rule bg-surface p-8 text-center">
          <p className="text-inkSoft">You haven&apos;t added any words yet.</p>
          <Link href="/submit" className="mt-2 inline-block font-medium text-lacquer hover:underline">Add your first word →</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((e: any) => {
            const first = [...(e.senses ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0];
            const body = (
              <div className="flex items-baseline gap-3">
                {e.hanzi && <span className="font-display text-xl font-bold">{e.hanzi}</span>}
                <span className="romanization font-display font-semibold text-lacquer">{e.romanization || e.headword}</span>
                <span className={`ml-auto font-mono text-[11px] uppercase tracking-wide ring-1 px-2 py-0.5 ${STATUS_STYLE[e.status]}`}>
                  {e.status}
                </span>
              </div>
            );
            return (
              <div key={e.id} className="border border-rule bg-surface p-4">
                {e.status === "approved" ? <Link href={`/entry/${e.id}`}>{body}</Link> : body}
                {first && <p className="mt-1 text-sm text-inkSoft">{first.definition_en}</p>}
                {e.status === "rejected" && e.review_notes && (
                  <p className="mt-2 text-sm text-inkFaint">Editor note: {e.review_notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

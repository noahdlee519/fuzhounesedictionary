import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-stone-200 text-stone-600",
};

export default async function AccountPage() {
  const { user, profile } = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="font-serif text-2xl font-bold">My submissions</h1>
        <p className="text-stone-600">Sign in to see the words you&apos;ve contributed.</p>
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
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-2xl font-bold">My submissions</h1>
        <span className="text-sm text-stone-500">{profile?.display_name}</span>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center dark:bg-stone-900 dark:border-stone-700">
          <p className="text-stone-600 dark:text-stone-300">You haven&apos;t added any words yet.</p>
          <Link href="/submit" className="mt-2 inline-block font-medium text-accent hover:underline">Add your first word →</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((e: any) => {
            const first = [...(e.senses ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0];
            const body = (
              <div className="flex items-baseline gap-3">
                {e.hanzi && <span className="font-serif text-xl">{e.hanzi}</span>}
                <span className="romanization font-semibold text-accent">{e.romanization || e.headword}</span>
                <span className={`ml-auto rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[e.status]}`}>
                  {e.status}
                </span>
              </div>
            );
            return (
              <div key={e.id} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                {e.status === "approved" ? <Link href={`/entry/${e.id}`}>{body}</Link> : body}
                {first && <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{first.definition_en}</p>}
                {e.status === "rejected" && e.review_notes && (
                  <p className="mt-2 text-sm text-stone-500">Editor note: {e.review_notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

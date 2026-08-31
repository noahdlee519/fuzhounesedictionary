import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import { approve, reject } from "./actions";
import type { Sense } from "@/lib/types";
import { formatOrigin } from "@/lib/origins";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderation queue",
  robots: { index: false, follow: false },
};

const chip =
  "font-mono text-[11px] uppercase tracking-wide text-inkSoft ring-1 ring-rule px-2 py-0.5";
const btn =
  "border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors";

export default async function AdminPage() {
  const { user, profile } = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">Editor sign-in</h1>
        <p className="text-inkSoft">Sign in with the account marked as an editor to review submissions.</p>
        <div className="flex justify-center"><SignInButton next="/admin" /></div>
      </div>
    );
  }

  if (!profile?.is_editor) {
    return (
      <div className="mx-auto max-w-lg space-y-3 text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">Editors only</h1>
        <p className="text-inkSoft">
          This account ({profile?.display_name}) is not an editor. Ask the site owner to set
          <code className="mx-1 font-mono text-sm">is_editor = true</code> on your profile in Supabase.
        </p>
        <Link href="/" className="text-lacquer hover:underline">← Home</Link>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("entries")
    .select("*, senses(*), contributor:profiles(id, display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const pending = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-4">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          Moderation queue
        </h1>
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          {pending.length} waiting
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="border border-rule bg-surface p-8 text-center text-inkSoft">
          Nothing waiting for review.
        </div>
      ) : (
        <div className="grid gap-4">
          {pending.map((e: any) => {
            const senses: Sense[] = [...(e.senses ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
            const origin = formatOrigin(e.origin_area, e.origin_locality) || e.variety;
            return (
              <div key={e.id} className="border border-rule bg-surface p-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  {e.hanzi && <span className="font-display text-2xl font-bold">{e.hanzi}</span>}
                  <span className="romanization font-display text-lg font-semibold text-lacquer">
                    {e.romanization || e.headword}
                  </span>
                  {e.ipa && <span className="font-mono text-sm text-inkFaint">/{e.ipa}/</span>}
                  {origin && <span className={chip}>{origin}</span>}
                  <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-inkFaint">
                    {new Date(e.created_at).toLocaleString()}
                    {" · "}
                    {e.contributor?.id ? (
                      <Link href={`/contributor/${e.contributor.id}`} className="hover:text-lacquer">
                        {e.contributor.display_name ?? "unknown"}
                      </Link>
                    ) : (
                      "unknown"
                    )}
                  </span>
                </div>

                {e.audio_url && <audio controls src={e.audio_url} className="mt-3 h-9 w-full max-w-xs" />}

                <ol className="mt-3 space-y-1">
                  {senses.map((s, i) => (
                    <li key={s.id} className="text-sm">
                      <span className="font-mono text-inkFaint tabular-nums">{i + 1}.</span>{" "}
                      {s.part_of_speech && <em className="text-lacquer">{s.part_of_speech} </em>}
                      {s.definition_en}
                      {s.gloss_zh && <span className="text-inkSoft"> · {s.gloss_zh}</span>}
                      {s.example && <span className="romanization text-inkSoft">—{s.example}</span>}
                    </li>
                  ))}
                </ol>

                {e.notes && <p className="mt-3 text-sm text-inkSoft">Notes: {e.notes}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                  <form action={approve}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className={`${btn} border-lacquer bg-lacquer text-paper hover:bg-transparent hover:text-lacquer`}>
                      ✓ Approve
                    </button>
                  </form>
                  <form action={reject} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={e.id} />
                    <label htmlFor={`note-${e.id}`} className="sr-only">Reason for rejection</label>
                    <input
                      id={`note-${e.id}`}
                      name="note"
                      placeholder="Reason (optional)"
                      className="border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
                    />
                    <button className={`${btn} border-rule text-inkSoft hover:border-lacquer hover:text-lacquer`}>
                      ✕ Reject
                    </button>
                  </form>
                  <Link
                    href={`/admin/edit/${e.id}`}
                    className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer hover:underline"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import { approve, reject } from "./actions";
import type { Sense } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, profile } = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="font-serif text-2xl font-bold">Editor sign-in</h1>
        <p className="text-stone-600">Sign in with the account marked as an editor to review submissions.</p>
        <div className="flex justify-center"><SignInButton next="/admin" /></div>
      </div>
    );
  }

  if (!profile?.is_editor) {
    return (
      <div className="mx-auto max-w-lg space-y-3 text-center">
        <h1 className="font-serif text-2xl font-bold">Editors only</h1>
        <p className="text-stone-600">
          This account ({profile?.display_name}) isn&apos;t an editor. Ask the site owner to set
          <code className="mx-1">is_editor = true</code> on your profile in Supabase.
        </p>
        <Link href="/" className="text-accent hover:underline">← Home</Link>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("entries")
    .select("*, senses(*), contributor:profiles(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const pending = data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">
        Moderation queue
        <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-sm text-white">{pending.length}</span>
      </h1>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500 dark:bg-stone-900 dark:border-stone-700">
          Nothing waiting for review. 🎉
        </div>
      ) : (
        <div className="grid gap-4">
          {pending.map((e: any) => {
            const senses: Sense[] = [...(e.senses ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
            return (
              <div key={e.id} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                <div className="flex flex-wrap items-baseline gap-3">
                  {e.hanzi && <span className="font-serif text-2xl">{e.hanzi}</span>}
                  <span className="romanization text-lg font-semibold text-accent">{e.romanization || e.headword}</span>
                  {e.ipa && <span className="text-sm text-stone-400">/{e.ipa}/</span>}
                  {e.variety && <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800">{e.variety}</span>}
                  <span className="ml-auto text-xs text-stone-400">
                    {new Date(e.created_at).toLocaleString()} · {e.contributor?.display_name ?? "unknown"}
                  </span>
                </div>

                {e.audio_url && <audio controls src={e.audio_url} className="mt-2 h-8 w-full max-w-xs" />}

                <ol className="mt-2 space-y-1">
                  {senses.map((s, i) => (
                    <li key={s.id} className="text-sm">
                      <span className="text-stone-400">{i + 1}.</span>{" "}
                      {s.part_of_speech && <em className="text-accent">{s.part_of_speech} </em>}
                      {s.definition_en}
                      {s.gloss_zh && <span className="text-stone-500"> · {s.gloss_zh}</span>}
                      {s.example && <span className="romanization text-stone-500"> — {s.example}</span>}
                    </li>
                  ))}
                </ol>

                {e.notes && <p className="mt-2 text-sm text-stone-500">Notes: {e.notes}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={approve}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="rounded-full bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">✓ Approve</button>
                  </form>
                  <form action={reject} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={e.id} />
                    <input name="note" placeholder="reason (optional)" className="rounded-full border border-stone-300 px-3 py-1.5 text-sm dark:bg-stone-800 dark:border-stone-600" />
                    <button className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300">✕ Reject</button>
                  </form>
                  <Link href={`/admin/edit/${e.id}`} className="text-sm text-accent hover:underline">Edit</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

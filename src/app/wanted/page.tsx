import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import { requestWord, voteRequest, fulfillRequest } from "./actions";

export const dynamic = "force-dynamic";

interface RankedRow {
  id: string;
  term: string;
  entry_id: string | null;
  note: string | null;
  status: string;
  votes: number;
  hanzi: string | null;
  romanization: string | null;
  entry_headword: string | null;
  entry_audio_url: string | null;
}

export default async function WantedPage() {
  const { user, profile } = await getSessionUser();
  const isEd = Boolean(profile?.is_editor);
  const supabase = createClient();

  const { data: rows, error } = await supabase
    .from("word_requests_ranked")
    .select("*")
    .eq("status", "open")
    .order("votes", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const requests = (rows as RankedRow[] | null) ?? [];

  let votedIds = new Set<string>();
  if (user) {
    const { data: myVotes } = await supabase
      .from("word_request_votes")
      .select("request_id")
      .eq("user_id", user.id);
    votedIds = new Set((myVotes ?? []).map((v: any) => v.request_id));
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-serif text-3xl font-bold">Words wanted</h1>
        <p className="max-w-2xl text-stone-600 dark:text-stone-400">
          Words the community is hoping to add — and words waiting for a real voice. Upvote the
          ones you want most, or ask for a word you know is missing. A native speaker can then
          record it or write the entry.
        </p>
      </section>

      {/* Ask for a word */}
      <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
        {user ? (
          <form action={requestWord} className="space-y-3">
            <input type="hidden" name="back" value="/wanted" />
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Word or phrase</span>
                <input
                  name="term"
                  required
                  placeholder="e.g. 鼎邊糊 or “dĭng-biĕng-gū”"
                  className="w-full rounded-lg border border-stone-300 bg-paper px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Note <span className="font-normal text-stone-400">(optional)</span></span>
                <input
                  name="note"
                  placeholder="What it means, where you heard it…"
                  className="w-full rounded-lg border border-stone-300 bg-paper px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800"
                />
              </label>
            </div>
            <button className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Request this word
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-600 dark:text-stone-300">Sign in to request a word or upvote.</p>
            <SignInButton next="/wanted" label="Sign in" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:border-accent" />
          </div>
        )}
      </section>

      {/* The list */}
      {error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Couldn&apos;t load requests. Make sure you&apos;ve run <code>supabase/word_requests.sql</code>.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
          {requests.length} open request{requests.length === 1 ? "" : "s"}
        </h2>

        {requests.length === 0 && !error && (
          <p className="text-stone-500">Nothing requested yet — be the first to ask for a word.</p>
        )}

        <ul className="grid gap-3">
          {requests.map((r) => {
            const voted = votedIds.has(r.id);
            const display = r.entry_id ? (r.hanzi || r.romanization || r.entry_headword || r.term) : r.term;
            const needsVoice = Boolean(r.entry_id);
            const audioLanded = needsVoice && Boolean(r.entry_audio_url);
            return (
              <li key={r.id} className="flex items-stretch gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
                {/* Vote control */}
                <form action={voteRequest} className="flex flex-col items-center justify-center">
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    title={user ? (voted ? "You upvoted this" : "Upvote") : "Sign in to vote"}
                    disabled={!user}
                    className={
                      "flex w-14 flex-col items-center rounded-lg border px-2 py-1 leading-tight transition " +
                      (voted
                        ? "border-accent bg-accentSoft text-accent"
                        : "border-stone-200 text-stone-500 hover:border-accent hover:text-accent dark:border-stone-700") +
                      (user ? "" : " cursor-not-allowed opacity-60")
                    }
                  >
                    <span aria-hidden className="text-base">▲</span>
                    <span className="text-sm font-semibold tabular-nums">{r.votes}</span>
                  </button>
                </form>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    {r.entry_id ? (
                      <Link href={`/entry/${r.entry_id}`} className="romanization text-lg font-semibold text-accent hover:underline">
                        {display}
                      </Link>
                    ) : (
                      <span className="romanization text-lg font-semibold text-ink dark:text-stone-100">{display}</span>
                    )}
                    <span className={"rounded px-2 py-0.5 text-xs " + (needsVoice ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300")}>
                      {needsVoice ? "🔊 needs a voice" : "＋ needs an entry"}
                    </span>
                    {audioLanded && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/40 dark:text-green-200">audio added</span>
                    )}
                  </div>
                  {r.note && <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{r.note}</p>}

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-400">
                    {needsVoice ? (
                      <Link href={`/entry/${r.entry_id}`} className="hover:text-accent">Open entry to add audio →</Link>
                    ) : (
                      <Link href={`/submit?romanization=${encodeURIComponent(r.term)}`} className="hover:text-accent">Add this word →</Link>
                    )}
                    {isEd && (
                      <form action={fulfillRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-stone-400 hover:text-accent">Mark done ✓</button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

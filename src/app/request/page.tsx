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
      .from("word_request_votes").select("request_id").eq("user_id", user.id);
    votedIds = new Set((myVotes ?? []).map((v: any) => v.request_id));
  }

  const inputCls =
    "w-full border border-rule bg-surface px-3 py-2 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint";

  return (
    <div className="space-y-9">
      <section className="border-b border-rule pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer">討教 · Request a word</p>
        <h1 className="mt-3 font-display text-3xl font-bold uppercase leading-tight tracking-tight sm:text-4xl">
          Request a word
        </h1>
        <p className="mt-4 max-w-2xl text-inkSoft">
          Ask for a word that is missing, or for a recording of a word that has no voice yet. Upvote
          the requests you want filled first. A speaker can then write the entry or record it.
        </p>
      </section>

      <section className="border border-rule bg-surface p-5">
        {user ? (
          <form action={requestWord} className="space-y-3">
            <input type="hidden" name="back" value="/request" />
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <label className="block">
                <span className="mb-1 block font-mono text-xs uppercase tracking-wide text-inkFaint">Word or phrase</span>
                <input name="term" required placeholder="e.g. 鼎邊糊 or “dĭng-biĕng-gū”" className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-xs uppercase tracking-wide text-inkFaint">Note (optional)</span>
                <input name="note" placeholder="What it means, or where you heard it" className={inputCls} />
              </label>
            </div>
            <button className="border border-lacquer bg-lacquer px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper transition-colors hover:bg-transparent hover:text-lacquer">
              Request this word
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-inkSoft">Sign in to request a word or to upvote.</p>
            <SignInButton next="/request" label="Sign in" className="border border-rule px-4 py-2 font-mono text-xs uppercase tracking-wide text-inkSoft hover:border-lacquer hover:text-lacquer" />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          {error ? "Open requests" : `${requests.length} open request${requests.length === 1 ? "" : "s"}`}
        </h2>

        {error && (
          <p className="text-inkSoft">
            The request board is unavailable at the moment. Please check back shortly.
          </p>
        )}

        {requests.length === 0 && !error && (
          <p className="text-inkSoft">No requests yet. Be the first to ask for a word.</p>
        )}

        <ul className="grid gap-3">
          {requests.map((r) => {
            const voted = votedIds.has(r.id);
            const display = r.entry_id ? (r.hanzi || r.romanization || r.entry_headword || r.term) : r.term;
            const needsVoice = Boolean(r.entry_id);
            const audioLanded = needsVoice && Boolean(r.entry_audio_url);
            return (
              <li key={r.id} className="flex items-stretch gap-4 border border-rule bg-surface p-4">
                <form action={voteRequest} className="flex flex-col items-center justify-center">
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    title={user ? (voted ? "You upvoted this" : "Upvote") : "Sign in to vote"}
                    disabled={!user}
                    className={
                      "flex w-14 flex-col items-center border px-2 py-1 leading-tight transition-colors " +
                      (voted ? "border-lacquer bg-accentSoft text-lacquer" : "border-rule text-inkFaint hover:border-lacquer hover:text-lacquer") +
                      (user ? "" : " cursor-not-allowed opacity-60")
                    }
                  >
                    <span aria-hidden className="text-base leading-none">▲</span>
                    <span className="font-mono text-sm font-medium tabular-nums">{r.votes}</span>
                  </button>
                </form>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {r.entry_id ? (
                      <Link href={`/entry/${r.entry_id}`} className="romanization font-display text-lg font-semibold text-lacquer hover:underline">
                        {display}
                      </Link>
                    ) : (
                      <span className="romanization font-display text-lg font-semibold text-ink">{display}</span>
                    )}
                    <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint ring-1 ring-rule px-2 py-0.5">
                      {needsVoice ? "needs a voice" : "needs an entry"}
                    </span>
                    {audioLanded && (
                      <span className="font-mono text-[11px] uppercase tracking-wide text-lacquer ring-1 ring-lacquer px-2 py-0.5">audio added</span>
                    )}
                  </div>
                  {r.note && <p className="mt-1 text-sm text-inkSoft">{r.note}</p>}

                  <div className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wide text-inkFaint">
                    {needsVoice ? (
                      <Link href={`/entry/${r.entry_id}`} className="hover:text-lacquer">Open entry to add audio →</Link>
                    ) : (
                      <Link href={`/submit?romanization=${encodeURIComponent(r.term)}`} className="hover:text-lacquer">Add this word →</Link>
                    )}
                    {isEd && (
                      <form action={fulfillRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="uppercase hover:text-lacquer">Mark done ✓</button>
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

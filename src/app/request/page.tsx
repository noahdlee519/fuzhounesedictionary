import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import ContributeTabs from "@/components/ContributeTabs";
import { requestWord, voteRequest, fulfillRequest } from "./actions";
import VoteButton from "./VoteButton";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wanted words",
  description:
    "Ask for a Fuzhounese word that is missing from the dictionary, or for a recording of one that has none yet.",
  alternates: { canonical: "/request" },
};

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

export default async function WantedPage({
  searchParams,
}: {
  searchParams: { notice?: string };
}) {
  const notice = (searchParams.notice ?? "").trim().slice(0, 300);
  const { user, profile } = await getSessionUser();
  const t = translator(getLang());
  const isEd = Boolean(profile?.is_editor);
  const supabase = createClient();

  // The board and the viewer's own votes are independent; fetched together.
  const [{ data: rows, error }, { data: myVotes }] = await Promise.all([
    supabase
      .from("word_requests_ranked")
      .select("*")
      .eq("status", "open")
      .order("votes", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
    user
      ? supabase.from("word_request_votes").select("request_id").eq("user_id", user.id)
      : Promise.resolve({ data: null }),
  ]);

  const requests = (rows as RankedRow[] | null) ?? [];
  const votedIds = new Set<string>((myVotes ?? []).map((v: any) => v.request_id));

  const inputCls =
    "w-full border border-rule bg-surface px-3 py-2 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint";

  return (
    <div className="space-y-9">
      <ContributeTabs active="wanted" />
      {user && (
        <p className="max-w-[60ch] text-[17px] leading-relaxed text-inkSoft">
          Words people are waiting for. Ask for one that is missing, or for a recording of one that
          has no recording yet, and upvote the ones you want filled first. A speaker can then write the
          entry or record it.
        </p>
      )}

      {notice && (
        <p className="border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">{notice}</p>
      )}

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
            <SubmitButton pending="Sending…" className="border border-lacquer bg-lacquer px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper transition-colors hover:bg-transparent hover:text-lacquer disabled:opacity-60">
              Request this word
            </SubmitButton>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-inkSoft">{t("wanted.signin")}</p>
            <SignInButton next="/request" label={t("nav.signin")} className="btn btn-ghost btn-sm" />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          {error || !user ? "Open requests" : `${requests.length} open request${requests.length === 1 ? "" : "s"}`}
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
                  <VoteButton
                    title={user ? (voted ? "You upvoted this" : "Upvote") : "Sign in to vote"}
                    locked={!user}
                    className={
                      "flex w-14 flex-col items-center border px-2 py-1 leading-tight transition-colors " +
                      (voted ? "border-lacquer bg-accentSoft text-lacquer" : "border-rule text-inkFaint hover:border-lacquer hover:text-lacquer") +
                      (user ? "" : " cursor-not-allowed opacity-60")
                    }
                  >
                    <span aria-hidden className="text-base leading-none">▲</span>
                    <span className="font-mono text-sm font-medium tabular-nums">{r.votes}</span>
                  </VoteButton>
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
                      {needsVoice ? "needs a recording" : "needs an entry"}
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
                        <SubmitButton pending="…" className="uppercase hover:text-lacquer disabled:opacity-60">
                          Mark done ✓
                        </SubmitButton>
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

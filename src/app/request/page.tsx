import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInGate from "@/components/SignInGate";
import { translator, pick } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import ContributeTabs from "@/components/ContributeTabs";
import { requestWord, fulfillRequest } from "./actions";
import RequestVote from "@/components/RequestVote";
import DeleteRequest from "@/components/DeleteRequest";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a word",
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
  searchParams: { notice?: string; found?: string };
}) {
  const notice = (searchParams.notice ?? "").trim().slice(0, 300);
  // A request for a word that turned out to be here already (actions.ts):
  // the notice links to it.
  const found = /^[0-9a-f-]{36}$/i.test(searchParams.found ?? "") ? searchParams.found! : null;
  const { user, profile } = await getSessionUser();
  const t = translator(getLang());
  const L = pick(getLang());
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
          {L(
            "Words people are waiting for. Ask for one that is missing, or for a recording of one that has no recording yet, and upvote the ones you want filled first. A speaker can then write the entry or record it.",
            "大家在等的詞。請求一個辭典裡還沒有的詞，或替還沒有錄音的詞請求錄音，再替你最想先補上的詞投票。會講的人就能寫詞條或錄音。"
          )}
        </p>
      )}

      {notice && (
        <p className="border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">
          {notice}
          {found && (
            <>
              {" "}
              <Link href={`/entry/${found}`} className="text-lacquer hover:underline">
                {L("Open it", "打開詞條")}
              </Link>
            </>
          )}
        </p>
      )}

      {user ? (
        <section className="border border-rule bg-surface p-5">
          <form action={requestWord} className="space-y-3">
            <input type="hidden" name="back" value="/request" />
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <label className="block">
                <span className="mb-1 block meta text-inkFaint">{L("Word or phrase", "詞或詞組")}</span>
                <input name="term" required placeholder={L("Characters, romanization, or the English word", "漢字、羅馬字或英文都可以")} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block meta text-inkFaint">{L("Note (optional)", "備註（選填）")}</span>
                <input name="note" placeholder={L("What it means, or where you heard it", "意思，或在哪裡聽到的")} className={inputCls} />
              </label>
            </div>
            <SubmitButton pending={L("Sending…", "送出中…")} className="border border-lacquer bg-lacquer px-4 py-2 meta text-paper transition-[color,background-color,border-color,transform] active:scale-[.97] hover:bg-transparent hover:text-lacquer disabled:opacity-60">
              {L("Request this word", "請求這個詞")}
            </SubmitButton>
          </form>
        </section>
      ) : (
        <SignInGate
          kind="wanted"
          title={L("Sign in to request a word", "登入後請求詞條")}
          text={L(
            "Ask for a word that is missing, or for a recording of one that has none, and upvote the requests you want filled first. Speakers see the list and fill it.",
            "請求辭典裡還沒有的詞，或替沒有錄音的詞請求錄音，再替你最想先補上的請求投票。會講的人看到清單就會補上。"
          )}
          next="/request"
        />
      )}

      <section className="space-y-3">
        <h2 className="meta text-inkFaint">
          {error || !user
            ? L("Open requests", "待處理的請求")
            : L(`{n} open request${requests.length === 1 ? "" : "s"}`, "{n} 個待處理的請求", { n: requests.length })}
        </h2>

        {error && (
          <p className="text-inkSoft">
            {L("The request board is unavailable at the moment. Please check back shortly.", "請求清單暫時無法使用，請稍後再試。")}
          </p>
        )}

        {requests.length === 0 && !error && (
          <p className="text-inkSoft">{L("No requests yet. Be the first to ask for a word.", "還沒有任何請求。來當第一個請求詞條的人吧。")}</p>
        )}

        <ul className="grid gap-3">
          {requests.map((r) => {
            const voted = votedIds.has(r.id);
            const display = r.entry_id ? (r.hanzi || r.romanization || r.entry_headword || r.term) : r.term;
            const needsVoice = Boolean(r.entry_id);
            return (
              <li key={r.id} className="flex items-stretch gap-4 border border-rule bg-surface p-4">
                <div className="flex flex-col items-center justify-center">
                  <RequestVote
                    id={r.id}
                    votes={r.votes}
                    voted={voted}
                    signedIn={!!user}
                    back="/request"
                    label={L(`{n} vote${r.votes === 1 ? "" : "s"}`, "{n} 票", { n: r.votes })}
                    tall
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {r.entry_id ? (
                      <Link href={`/entry/${r.entry_id}`} className="romanization font-display text-lg font-semibold text-lacquer hover:underline">
                        {display}
                      </Link>
                    ) : (
                      <span className="romanization font-display text-lg font-semibold text-ink">{display}</span>
                    )}
                    <span className="meta text-inkFaint ring-1 ring-rule px-2 py-0.5">
                      {needsVoice ? L("needs a recording", "需要錄音") : L("needs an entry", "尚無詞條")}
                    </span>
                  </div>
                  {r.note && <p className="mt-1 text-sm text-inkSoft">{r.note}</p>}

                  <div className="mt-2 flex flex-wrap gap-4 meta text-inkFaint">
                    {needsVoice ? (
                      <Link href={`/entry/${r.entry_id}`} className="hover:text-lacquer">{L("Open entry to add audio", "打開詞條加上錄音")}</Link>
                    ) : (
                      <Link href={`/add?romanization=${encodeURIComponent(r.term)}`} className="hover:text-lacquer">{L("Add this word", "新增這個詞")}</Link>
                    )}
                    {isEd && (
                      <form action={fulfillRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton pending="…" className="meta hover:text-lacquer disabled:opacity-60">
                          {L("Mark done ✓", "標為完成 ✓")}
                        </SubmitButton>
                      </form>
                    )}
                    {isEd && <DeleteRequest id={r.id} back="/request" />}
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

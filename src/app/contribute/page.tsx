import Link from "next/link";
import { recordingsTrusted } from "@/lib/trust";
import HeroMark from "@/components/HeroMark";
import type { Metadata } from "next";
import Avatar from "@/components/Avatar";
import ContributeIcon from "@/components/ContributeIcon";
import DeleteRequest from "@/components/DeleteRequest";
import RequestVote from "@/components/RequestVote";
import { getSessionUser } from "@/lib/auth";
import { reviewCount } from "@/lib/review";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/entries";
import { topContributors, type TopContributor } from "@/lib/public-stats";
import { originArea } from "@/lib/origins";
import LocalTime from "@/components/LocalTime";
import { translator, pick as pickLang, type Key } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { romText } from "@/lib/rom";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const L = pickLang(getLang());
  return {
    title: L("Contribute", "貢獻"),
    description: L(
      "Help the Fuzhounese dictionary whatever your level: record a word, add a word, improve a word, or ask for one. Everything is read by an editor before it goes live.",
      "不論程度如何，都能幫福州話辭典一把：錄一個詞、新增詞條、完善詞條，或請求詞條。所有內容上線前都由編輯審閱。"
    ),
    alternates: { canonical: "/contribute" },
  };
}

/* The Contribute hub, from the mock-up: the four ways in as tiles with the
   time each takes, what people are waiting for beside what just arrived,
   and the people who have given the most. The four ways keep their own
   pages (/improve, /add, /request); this is the door. */

/* A clock for the minutes-and-seconds label on each tile. Drawn to the same
   16px box and 1.6 stroke as the magnifier in the search bar, so it sits in
   the small caps as a unit marker rather than as an illustration — the hands
   read at 12px, anything finer does not. */
function Clock({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.6V8l2.4 1.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* "Record a word" → ["Record", " a word"]; 錄一個詞 → ["錄", "一個詞"],
   新增詞條 → ["新增", "詞條"]: the verb is everything before the first space,
   or in Chinese the characters before 一 or 詞. */
function splitVerb(h: string): [string, string] {
  const sp = h.indexOf(" ");
  if (sp > 0) return [h.slice(0, sp), h.slice(sp)];
  const m = h.match(/^(.+?)(一.*|詞.*)$/);
  return m ? [m[1], m[2]] : [h, ""];
}

const WAYS: { key: "record" | "add" | "improve" | "wanted"; href: string }[] = [
  { key: "record", href: "/improve?need=recording" },
  { key: "add", href: "/add" },
  { key: "improve", href: "/improve" },
  { key: "wanted", href: "/request" },
];

interface Recent {
  id: string;
  hanzi: string | null;
  romanization: string;
  who: string | null;
  kind: "recorded" | "added";
  at: string;
}

export default async function ContributePage() {
  const lang = getLang();
  const t = translator(lang);
  const L = pickLang(lang);
  const supabase = createClient();
  const { user: meUser, profile: me } = await getSessionUser();
  const editor = Boolean(me?.is_editor);
  const waiting = editor ? await reviewCount().catch(() => 0) : 0;

  let wanted: { id: string; term: string; votes: number; entry_id: string | null }[] = [];
  let recent: Recent[] = [];
  let inReview: number | null = null;
  let reviewDays: number | null = null;
  let people: TopContributor[] = [];
  const myVotes = new Set<string>();

  try {
    // Counted with the service role: RLS shows a visitor none of the pending
    // rows and a contributor only their own, so the "In review" number was 0
    // for everyone but editors. It is a count only; no rows leave the server.
    const admin = adminClient();
    const pending = (table: string) =>
      admin.from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
    const [{ data: wants }, { data: recs }, { data: added }, { data: reviewed }, top, ...queues] = await Promise.all([
      supabase
        .from("word_requests_ranked")
        .select("id, term, votes, entry_id")
        .eq("status", "open")
        .order("votes", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("recordings")
        // No embeds; the word and the speaker are looked up by id below. Same
        // silent failure as the home page's list — see the note there.
        .select("entry_id, created_at, contributor_id")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(24),
      // Words people wrote, not the imported ones (those link to their source).
      supabase
        .from("entries")
        .select("id, hanzi, romanization, headword, created_at, contributor:profiles(display_name)")
        .eq("status", "approved")
        .not("contributor_id", "is", null)
        .or("notes.is.null,notes.not.ilike.*wiktionary.org*")
        .order("created_at", { ascending: false })
        .limit(6),
      // How long the last fifty reviews of people's words took, for the footnote.
      supabase
        .from("entries")
        .select("created_at, reviewed_at")
        .eq("status", "approved")
        .not("reviewed_at", "is", null)
        .not("contributor_id", "is", null)
        .or("notes.is.null,notes.not.ilike.*wiktionary.org*")
        .order("reviewed_at", { ascending: false })
        .limit(50),
      topContributors(6).catch(() => [] as TopContributor[]),
      pending("entries"),
      pending("recordings"),
      pending("suggestions"),
    ]);
    wanted = (wants ?? []) as typeof wanted;
    people = top;
    if (meUser && wanted.length) {
      const { data: mv } = await supabase
        .from("word_request_votes")
        .select("request_id")
        .eq("user_id", meUser.id)
        .in("request_id", wanted.map((w) => w.id));
      for (const v of (mv ?? []) as any[]) myVotes.add(v.request_id);
    }

    const seen = new Set<string>();
    const pick: any[] = [];
    for (const r of (recs ?? []) as any[]) {
      if (!r.entry_id || seen.has(r.entry_id)) continue;
      seen.add(r.entry_id);
      pick.push(r);
      if (pick.length === 12) break;
    }
    if (pick.length) {
      const ids = [...new Set(pick.map((r) => r.contributor_id).filter(Boolean))];
      const [{ data: ents }, { data: profs }] = await Promise.all([
        supabase
          .from("entries")
          .select("id, hanzi, romanization, headword")
          .in("id", pick.map((r) => r.entry_id))
          .eq("status", "approved"),
        ids.length
          ? supabase.from("profiles").select("id, display_name").in("id", ids)
          : Promise.resolve({ data: [] } as any),
      ]);
      const names = new Map(((profs ?? []) as any[]).map((p) => [p.id, p.display_name ?? null]));
      const byId = new Map(((ents ?? []) as any[]).map((e) => [e.id, e]));
      for (const r of pick) {
        const e = byId.get(r.entry_id);
        if (!e) continue;
        recent.push({
          id: e.id, hanzi: e.hanzi, romanization: e.romanization || e.headword,
          who: names.get(r.contributor_id) ?? null, kind: "recorded", at: r.created_at,
        });
      }
    }
    for (const e of (added ?? []) as any[]) {
      if (seen.has(e.id)) continue;
      recent.push({
        id: e.id, hanzi: e.hanzi, romanization: e.romanization || e.headword,
        who: one<any>(e.contributor)?.display_name ?? null, kind: "added", at: e.created_at,
      });
    }
    recent.sort((a, b) => b.at.localeCompare(a.at));
    recent = recent.slice(0, 6);

    // Median review time in days; only shown when there is something to measure.
    const spans = ((reviewed ?? []) as any[])
      .map((r) => (new Date(r.reviewed_at).getTime() - new Date(r.created_at).getTime()) / 86_400_000)
      .filter((d) => d >= 0)
      .sort((a, b) => a - b);
    if (spans.length >= 3) reviewDays = Math.max(1, Math.round(spans[Math.floor(spans.length / 2)]));

    // A queue whose table is missing (a migration not yet run) counts as empty.
    inReview = queues.reduce((n, q: any) => n + (q?.error ? 0 : q?.count ?? 0), 0);
  } catch {
    /* the sections below simply skip what they did not get */
  }

  return (
    <div className="-my-10">
      {/* Hero */}
      <section className="relative isolate pb-14 pt-20 max-[760px]:pb-9 max-[760px]:pt-11">
        <HeroMark />
        <p className="eyebrow">{t("nav.contribute")}</p>
        <h1 className="display mt-2 max-w-[18ch] [text-wrap:balance]">{t("hub.h")}</h1>
        <p className="lede read mt-6 [text-wrap:pretty]">{t(recordingsTrusted() ? "hub.lede.trust" : "hub.lede")}</p>
        {/* Editors only: the way into the review queue, with how much is
            waiting. A quiet outlined button with one red count, under the
            lede where an editor looks first. */}
        {editor && (
          <div className="mt-8">
          <p className="eyebrow mb-2">{L("Editors:", "編輯：")}</p>
          <Link href="/editor" className="btn btn-ghost gap-3">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l2.5 2.5L16 9" />
              <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
            </svg>
            {L("Review contributions", "審核貢獻")}
            {waiting > 0 && (
              <span className="min-w-[22px] rounded-full bg-lacquer px-1.5 text-center text-xs font-bold leading-[22px] tabular-nums text-white">
                {waiting > 99 ? "99+" : waiting}
              </span>
            )}
          </Link>
          </div>
        )}
      </section>
      <hr className="rule-bleed" />

      {/* The four ways in */}
      <section className="sec">
        <div className="grid gap-x-12 md:grid-cols-2">
          {WAYS.map((w) => (
            <Link key={w.key} href={w.href} className="group flex items-start gap-4 border-b border-rule py-5">
              {/* The action's icon, the same one its sign-in box carries. */}
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accentSoft text-lacquer transition-colors group-hover:bg-lacquer group-hover:text-paper">
                <ContributeIcon kind={w.key} className="h-[22px] w-[22px]" />
              </span>
              <span className="min-w-0">
                <span className="eyebrow inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3 shrink-0 opacity-70" />
                  {t(`hub.${w.key}.time` as Key)}
                </span>
                {/* The verb in red, the rest ("a word", 詞條) in ink. */}
                {(() => {
                  const [verb, rest] = splitVerb(t(`hub.${w.key}.h` as Key));
                  return (
                    <h2 className="h3 mt-1 text-ink">
                      <span className="text-lacquer">{verb}</span>
                      {rest}
                    </h2>
                  );
                })()}
                <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-inkSoft">{t(`hub.${w.key}.p` as Key)}</p>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <hr className="rule-bleed" />

      {/* Waiting, and just arrived */}
      <section className="sec">
        <div className="grid gap-14 md:grid-cols-2 max-[900px]:gap-11">
          <div>
            <h2 className="h2">{t("mod.requested")}</h2>
            <div className="mt-4">
              {wanted.length ? (
                wanted.map((x) => (
                  <div key={x.id} className="flex items-center gap-3 border-b border-rule py-2.5 last:border-b-0">
                    <RequestVote
                      id={x.id}
                      votes={x.votes}
                      voted={myVotes.has(x.id)}
                      signedIn={!!meUser}
                      back="/contribute"
                      label={t("mod.votes", { n: x.votes })}
                    />
                    <div className="min-w-0 flex-1">
                      <Link href="/request" className="text-[15px] hover:text-lacquer">{x.term}</Link>
                      {/* The second line, with the editors' Delete at its right on the
                          same baseline as "needs an entry". */}
                      <div className="flex items-baseline justify-between gap-3">
                        {x.entry_id ? (
                          <Link href={`/entry/${x.entry_id}`} className="link text-xs">
                            {t("mod.open")}
                          </Link>
                        ) : (
                          <span className="text-xs text-inkMute">{t("mod.needsEntry")}</span>
                        )}
                        {editor && <DeleteRequest id={x.id} back="/contribute" />}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-inkSoft">{t("mod.nothingWaiting")}</p>
              )}
            </div>
            <p className="mt-5">
              <Link href="/request" className="link text-sm">
                {t("mod.askFor")}
              </Link>
            </p>
          </div>

          <div>
            <h2 className="h2">{t("hub.recent.h")}</h2>
            <div className="mt-4">
              {recent.length ? (
                recent.map((r) => (
                  <div key={`${r.kind}-${r.id}`} className="mini">
                    <Link href={`/entry/${r.id}`} className="group min-w-0 flex-1">
                      <span className="text-[15px]">
                        {r.hanzi && <span className="han font-medium group-hover:text-lacquer">{r.hanzi} </span>}
                        <span className="romanization text-xs text-ink">{romText(r.romanization, r.romanization)}</span>
                        <span className="text-inkSoft">
                          {"—"}
                          {t(r.kind === "recorded" ? "hub.recent.recorded" : "hub.recent.added", { who: r.who || t("hub.recent.someone") })}
                        </span>
                      </span>
                      <span className="block text-xs leading-[1.35] text-inkMute"><LocalTime iso={r.at} /></span>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-sm text-inkSoft">{t("hub.recent.none")}</p>
              )}
            </div>
            {inReview !== null && (
              <p className="footnote mt-5">
                {/* Editors go straight to the queue from here. */}
                {editor ? (
                  <Link href="/editor" className="underline decoration-rule underline-offset-2 hover:text-lacquer hover:decoration-lacquer">
                    {t("hub.review.n", { n: inReview })}
                  </Link>
                ) : (
                  t("hub.review.n", { n: inReview })
                )}
                {reviewDays !== null && (
                  <>
                    {" · "}
                    {reviewDays <= 1 ? t("hub.review.day") : t("hub.review.days", { d: reviewDays })}
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* The people */}
      {people.length > 0 && (
        <>
          <hr className="rule-bleed" />
          <section className="sec">
            <h2 className="h2">{t("hub.people.h")}</h2>
            <div className="mt-4 grid gap-x-12 md:grid-cols-2">
              {people.map((p) => {
                const area = originArea(p.origin_area);
                const line = [
                  area ? `${area.label} ${area.hanzi}` : null,
                  p.recordings === 1 ? t("mod.recording") : t("mod.recordings", { n: p.recordings }),
                  p.words ? (p.words === 1 ? t("hub.people.word") : t("hub.people.words", { n: p.words })) : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Link key={p.id} href={`/contributor/${p.id}`} className="group flex items-center gap-4 border-b border-rule py-4">
                    <Avatar src={p.avatar_url} name={p.display_name} size={44} className="ring-1 ring-rule" />
                    <span className="min-w-0 flex-1">
                      <span className="h3 block truncate transition-colors group-hover:text-lacquer">
                        {p.display_name || L("A contributor", "一位貢獻者")}
                      </span>
                      <span className="block text-sm text-inkSoft">{line}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/entries";
import { topContributors, type TopContributor } from "@/lib/public-stats";
import { originArea } from "@/lib/origins";
import { formatDate } from "@/lib/dates";
import { translator, type Key } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contribute",
  description:
    "Help the Fuzhounese dictionary whatever your level: record a word, add a word, improve a word, or ask for one. Everything is read by an editor before it goes live.",
  alternates: { canonical: "/contribute" },
};

/* The Contribute hub, from the mock-up: the four ways in as tiles with the
   time each takes, what people are waiting for beside what just arrived,
   and the people who have given the most. The four ways keep their own
   pages (/improve, /submit, /request); this is the door. */

const WAYS: { key: "record" | "add" | "improve" | "wanted"; href: string }[] = [
  { key: "record", href: "/improve?need=recording" },
  { key: "add", href: "/submit" },
  { key: "improve", href: "/improve" },
  { key: "wanted", href: "/request" },
];

/* A small clock beside each tile's time cost. Drawn in the current colour,
   so it takes the eyebrow's grey. */
function Clock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="-mt-px">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

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
  const supabase = createClient();

  let wanted: { id: string; term: string; votes: number; entry_id: string | null }[] = [];
  let recent: Recent[] = [];
  let inReview: number | null = null;
  let reviewDays: number | null = null;
  let people: TopContributor[] = [];

  try {
    const pending = (table: string) =>
      supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
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
        .select("entry_id, created_at, contributor:profiles(display_name), entry:entries!inner(id, hanzi, romanization, headword, status)")
        .eq("status", "approved")
        .eq("entry.status", "approved")
        .order("created_at", { ascending: false })
        .limit(6),
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

    const seen = new Set<string>();
    for (const r of (recs ?? []) as any[]) {
      const e = one<any>(r.entry);
      if (!e?.id) continue;
      seen.add(e.id);
      recent.push({
        id: e.id, hanzi: e.hanzi, romanization: e.romanization || e.headword,
        who: one<any>(r.contributor)?.display_name ?? null, kind: "recorded", at: r.created_at,
      });
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
      <section className="pb-14 pt-20 max-[760px]:pb-9 max-[760px]:pt-11">
        <p className="eyebrow">{t("nav.contribute")}</p>
        <h1 className="display mt-2 max-w-[18ch] [text-wrap:balance]">{t("hub.h")}</h1>
        <p className="lede read mt-6">{t("hub.lede")}</p>
      </section>
      <hr className="rule-bleed" />

      {/* The four ways in */}
      <section className="sec">
        <div className="grid gap-x-12 md:grid-cols-2">
          {WAYS.map((w) => (
            <Link key={w.key} href={w.href} className="group block border-b border-rule py-5">
              <p className="eyebrow inline-flex items-center gap-1.5">
                <Clock />
                {t(`hub.${w.key}.time` as Key)}
              </p>
              <h2 className="h3 mt-2 text-lacquer transition-opacity group-hover:opacity-80">{t(`hub.${w.key}.h` as Key)}</h2>
              <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-inkSoft">{t(`hub.${w.key}.p` as Key)}</p>
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
                    <Link
                      href="/request"
                      className="inline-flex h-9 min-w-[52px] items-center justify-center gap-1 rounded-full border border-ruleStrong px-2 font-mono text-xs text-inkSoft hover:border-lacquer hover:text-lacquer"
                      aria-label={t("mod.votes", { n: x.votes })}
                    >
                      ▲ {x.votes}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px]">{x.term}</div>
                      {x.entry_id ? (
                        <Link href={`/entry/${x.entry_id}`} className="link text-xs">
                          {t("mod.open")}
                        </Link>
                      ) : (
                        <div className="text-xs text-inkMute">{t("mod.needsEntry")}</div>
                      )}
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
                    <span
                      className={`mt-2 inline-block h-2 w-2 shrink-0 self-start rounded-full ${r.kind === "recorded" ? "bg-green" : "bg-lacquer"}`}
                      aria-hidden="true"
                    />
                    <Link href={`/entry/${r.id}`} className="group min-w-0 flex-1">
                      <span className="text-[15px]">
                        {r.hanzi && <span className="han font-medium group-hover:text-lacquer">{r.hanzi} </span>}
                        <span className="romanization text-xs text-inkSoft">{r.romanization}</span>
                        <span className="text-inkSoft">
                          {"—"}
                          {t(r.kind === "recorded" ? "hub.recent.recorded" : "hub.recent.added", { who: r.who || t("hub.recent.someone") })}
                        </span>
                      </span>
                      <span className="block text-xs leading-[1.35] text-inkMute">{formatDate(r.at)}</span>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-sm text-inkSoft">{t("hub.recent.none")}</p>
              )}
            </div>
            {inReview !== null && (
              <p className="footnote mt-5">
                {t("hub.review.n", { n: inReview })}
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
                        {p.display_name || "A contributor"}
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

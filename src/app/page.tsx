import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import PlayButton from "@/components/PlayButton";
import AskSection from "@/components/AskSection";
import ContributorCard from "@/components/ContributorCard";
import { createClient } from "@/lib/supabase/server";
import type { SearchRow } from "@/lib/types";
import { one, recordingCounts, firstSense } from "@/lib/entries";
import { getSessionUser } from "@/lib/auth";
import { searchContributors, type ContributorHit } from "@/lib/contributors";
import { missionTally, topContributors, type MissionTally, type TopContributor } from "@/lib/public-stats";
import { originArea } from "@/lib/origins";
import { formatDate } from "@/lib/dates";
import { translator, samples } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import Avatar from "@/components/Avatar";
import InfoTip from "@/components/InfoTip";

export const dynamic = "force-dynamic";

/* ---------------------------------------------------------------------------
   The home page, in the 9 Sep 2026 design. Without a query: the mission in
   two lines, the search, two doors (learner, speaker), the mission numbers
   with a bar per district, four modules of live content, and the assistant.
   With a query: the search box and the results as rows.
   --------------------------------------------------------------------------- */

interface MiniRow {
  id: string;
  hanzi: string | null;
  romanization: string | null;
  headword: string;
  meta: string;
  audio: string | null;
}

/* A compact row: play button, characters + romanization, one grey line. */
function Mini({ r, label }: { r: MiniRow; label: string }) {
  return (
    <div className="mini">
      {r.audio ? (
        <PlayButton src={r.audio} size="xs" label={label} />
      ) : (
        <span className="inline-block h-9 w-9 shrink-0 rounded-full border border-dashed border-ruleStrong" aria-hidden="true" />
      )}
      <Link href={`/entry/${r.id}`} className="min-w-0 flex-1">
        {r.hanzi ? (
          <>
            <span className="han text-[19px] font-medium">{r.hanzi}</span>{" "}
            <span className="romanization text-xs text-inkSoft">{r.romanization || r.headword}</span>
          </>
        ) : (
          <span className="text-[17px] font-semibold">{r.romanization || r.headword}</span>
        )}
        <div className="text-xs leading-[1.35] text-inkSoft">{r.meta}</div>
      </Link>
    </div>
  );
}

function ResultRow({ r, recordings }: { r: SearchRow; recordings: number }) {
  return (
    <Link
      href={`/entry/${r.id}`}
      className="flex items-baseline gap-3.5 border-b border-rule px-1 py-3.5 transition-colors hover:bg-surface2"
    >
      {r.hanzi && <span className="han min-w-[3.4em] text-2xl font-medium">{r.hanzi}</span>}
      <span className="romanization text-[15px] font-semibold tracking-[-.01em]">{r.romanization || r.headword}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-inkSoft">
        {r.short_gloss}
        {(r.sense_count ?? 0) > 1 && <span className="text-inkMute"> · {r.sense_count} meanings</span>}
      </span>
      <span className="shrink-0 text-xs text-inkMute">{recordings ? `${recordings} ♪` : "—"}</span>
    </Link>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string; auth_error?: string; deleted?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const supabase = createClient();
  const { user } = await getSessionUser();
  const lang = getLang();
  const t = translator(lang);

  const notices = (
    <>
      {searchParams.deleted && (
        <p role="status" className="wrap mb-6 rounded-xl bg-surface px-5 py-3 text-sm text-inkSoft">
          Your account has been deleted. Thank you for everything you added.
        </p>
      )}
      {searchParams.auth_error && (
        <p role="alert" className="mb-6 rounded-xl bg-surface px-5 py-3 text-sm text-inkSoft">
          <span className="font-semibold text-ink">Sign-in did not complete.</span> {searchParams.auth_error}{" "}
          Please try again, and if it keeps happening let Noah know what it says here.
        </p>
      )}
    </>
  );

  /* ---------------------------------------------------------------- results */
  if (q) {
    let rows: SearchRow[] = [];
    let counts = new Map<string, number>();
    let people: ContributorHit[] = [];
    let errored = false;
    try {
      const [{ data, error }, found] = await Promise.all([
        supabase.rpc("search_entries", { q }),
        searchContributors(supabase, q).catch(() => [] as ContributorHit[]),
      ]);
      if (error) throw error;
      rows = (data ?? []) as SearchRow[];
      people = found;
      counts = await recordingCounts(supabase, rows.map((r) => r.id));
    } catch {
      errored = true;
    }
    return (
      <div className="-my-10 py-10">
        {notices}
        <SearchBar
          defaultValue={q}
          signedIn={!!user}
          assistant
          placeholderFull={t("search.full")}
          placeholderShort={t("search.short")}
          label={t("search.label")}
          hint={
            errored
              ? t("results.unavailable")
              : (rows.length === 1 ? t("results.one", { q }) : t("results.for", { n: rows.length, q })) +
                (people.length ? ` · ${people.length === 1 ? t("results.person") : t("results.people", { n: people.length })}` : "")
          }
        />
        {people.length > 0 && (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {people.map((c) => (
              <ContributorCard key={c.id} c={c} />
            ))}
          </div>
        )}
        <div className="mt-4">
          {rows.map((r) => (
            <ResultRow key={r.id} r={r} recordings={(r.audio_url ? 1 : 0) + (counts.get(r.id) ?? 0)} />
          ))}
        </div>
        {!errored && rows.length === 0 && people.length === 0 && (
          <p className="footnote px-1 py-3">
            {t("results.none", { q })}{" "}
            <Link href={`/submit?romanization=${encodeURIComponent(q)}`} className="link">
              {t("results.add")}
            </Link>
          </p>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------------- home */
  let tally: MissionTally | null = null;
  let newest: MiniRow[] = [];
  let wanted: { id: string; term: string; votes: number; entry_id: string | null }[] = [];
  let wotd: (MiniRow & { gloss: string | null }) | null = null;
  let top: TopContributor[] = [];

  try {
    const [numbers, people, { data: recs }, { data: wants }] = await Promise.all([
      missionTally(),
      topContributors(4).catch(() => [] as TopContributor[]),
      supabase
        .from("recordings")
        .select(
          "entry_id, audio_url, created_at, origin_area, contributor:profiles(display_name), entry:entries!inner(id, hanzi, romanization, headword, status)"
        )
        .eq("status", "approved")
        .eq("entry.status", "approved")
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("word_requests_ranked")
        .select("id, term, votes, entry_id")
        .eq("status", "open")
        .order("votes", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4),
    ]);
    tally = numbers;
    top = people;
    wanted = (wants ?? []) as typeof wanted;

    const seen = new Set<string>();
    for (const r of (recs ?? []) as any[]) {
      const e = one<any>(r.entry);
      if (!e?.id || seen.has(e.id)) continue;
      seen.add(e.id);
      const who = one<any>(r.contributor)?.display_name;
      const where = originArea(r.origin_area);
      newest.push({
        id: e.id, hanzi: e.hanzi, romanization: e.romanization, headword: e.headword, audio: r.audio_url,
        meta: [who, where ? `${where.label} ${where.hanzi}` : null, formatDate(r.created_at)].filter(Boolean).join(" · "),
      });
      if (newest.length === 4) break;
    }

    // Word of the day: one voiced entry, the same for everyone all day.
    const ids = numbers?.voicedIds ?? [];
    const day = Math.floor(Date.now() / 86_400_000);
    const wotdId = ids.length ? ids[day % ids.length] : null;
    const [{ data: w }, { data: wRec }] = await Promise.all([
      wotdId
        ? supabase.from("entries").select("id, hanzi, romanization, headword, audio_url, senses(definition_en, sort)").eq("id", wotdId).maybeSingle()
        : Promise.resolve({ data: null } as any),
      wotdId
        ? supabase.from("recordings").select("audio_url").eq("entry_id", wotdId).eq("status", "approved").order("created_at").limit(1)
        : Promise.resolve({ data: null } as any),
    ]);
    if (w) {
      wotd = {
        id: w.id, hanzi: w.hanzi, romanization: w.romanization, headword: w.headword,
        audio: (wRec as any[])?.[0]?.audio_url ?? w.audio_url ?? null,
        gloss: firstSense<any>(w.senses)?.definition_en ?? null, meta: "",
      };
    }
  } catch {
    /* the sections below simply skip what they did not get */
  }

  const words = tally?.words ?? 0;
  const voiced = tally?.voiced ?? 0;
  const pct = words ? Math.round((voiced / words) * 100) : 0;
  const silent = Math.max(0, words - voiced);
  const modules = [wotd, true, true, top.length > 0].filter(Boolean).length;

  return (
    <div className="-my-10">
      {(searchParams.deleted || searchParams.auth_error) && <div className="pt-6">{notices}</div>}

      {/* Hero. The word for the language itself stands in the empty space to
          the right at 5% ink, dropped a little below the top so it sits
          beside the headline rather than above it; on a phone it shrinks and
          fades further so the headline stays the thing you read. */}
      <section className="relative pb-14 pt-20 max-[760px]:pb-9 max-[760px]:pt-11">
        <span
          aria-hidden="true"
          lang="zh-Hant"
          className="han pointer-events-none absolute -right-2 top-12 select-none whitespace-nowrap text-[clamp(72px,11vw,150px)] font-bold leading-none text-ink opacity-[.05] max-[760px]:top-2 max-[760px]:opacity-[.035]"
        >
          福州話
        </span>
        <div className="relative">
          <h1 className="display">
            {t("hero.1")}
            <br />
            {t("hero.2")}
          </h1>
          <p className="lede read relative mt-6">
            {t("hero.lede.1")}
            <InfoTip id="dialect-tip" text={t("hero.tip")} />
            {t("hero.lede.2")}
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="relative pb-14">
        <SearchBar
          signedIn={!!user}
          placeholderFull={t("search.full")}
          placeholderShort={t("search.short")}
          label={t("search.label")}
          hint={
            <>
              {words ? `${t("hint.count", { n: words.toLocaleString() })} ` : ""}
              {t("hint.try")}
            </>
          }
          after={
            <Link href="#ask" className="link text-[13px]">
              {t("ask.link")}
            </Link>
          }
        />
      </section>
      <hr className="rule-bleed" />

      {/* Two doors */}
      <section className="sec">
        <div className="grid gap-14 md:grid-cols-2 max-[900px]:gap-11">
          <div>
            <p className="eyebrow">{t("nav.learn")}</p>
            <h2 className="h1 mt-2">
              {t("door.learn.h1")}
              <br />
              {t("door.learn.h2")}
            </h2>
            <p className="mt-3 max-w-[34ch] text-inkSoft">{t("door.learn.p")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/learn" className="btn btn-primary">
                {t("door.learn.btn")}
              </Link>
              <Link href="/browse" className="linkq">
                {t("door.learn.link")}
              </Link>
            </div>
          </div>
          <div>
            <p className="eyebrow">{t("nav.contribute")}</p>
            <h2 className="h1 mt-2">
              {t("door.contribute.h1")}
              <br />
              {t("door.contribute.h2")}
            </h2>
            <p className="mt-3 max-w-[34ch] text-inkSoft">{t("door.contribute.p")}</p>
            {tally && (
              <p className="mt-4 font-mono text-[13px] text-inkSoft">
                {t("door.contribute.counter", { silent: silent.toLocaleString(), voiced: voiced.toLocaleString() })
                  .split(/(\d[\d,]*)/)
                  .map((part, i) => (/^\d[\d,]*$/.test(part) ? <b key={i} className="font-medium text-lacquer">{part}</b> : part))}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/improve?need=recording" className="btn btn-primary">
                {t("door.contribute.btn")}
              </Link>
              <Link href="/submit" className="linkq">
                {t("door.contribute.link")}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <hr className="rule-bleed" />

      {/* Mission progress: two numbers and a call to action. */}
      {tally && (
        <>
          <section className="sec">
            <p className="eyebrow">{t("mission.eyebrow")}</p>
            <h2 className="h1 mt-2 max-w-[22ch]">
              {t("mission.h", { words: words.toLocaleString(), recs: tally.recordings.toLocaleString() })}
            </h2>
            <p className="lede mt-4 max-w-[46ch]">{t("mission.lede", { pct })}</p>
            <div className="mt-8 h-1 max-w-[640px] overflow-hidden rounded-sm bg-surface" aria-hidden="true">
              <i className="block h-full bg-lacquer" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/improve?need=recording" className="btn btn-primary">
                {t("mission.btn")}
              </Link>
              <Link href="/submit" className="linkq">
                {t("mission.link")}
              </Link>
            </div>
          </section>
          <hr className="rule-bleed" />
        </>
      )}

      {/* Four modules */}
      <section className="sec">
        <div className={`grid gap-10 max-[900px]:grid-cols-2 max-[760px]:grid-cols-1 ${modules >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {wotd && (
            <div className="self-start rounded-xl bg-accentSoft p-5">
              <h3 className="h3 mb-4">{t("mod.wotd")}</h3>
              <Link href={`/entry/${wotd.id}`}>
                {wotd.hanzi ? (
                  <div className="han text-[44px] leading-[1.1]">{wotd.hanzi}</div>
                ) : (
                  <div className="text-[32px] font-semibold leading-[1.1] tracking-tight">{wotd.romanization || wotd.headword}</div>
                )}
              </Link>
              {wotd.hanzi && <div className="romanization mt-2 text-sm">{wotd.romanization || wotd.headword}</div>}
              {wotd.gloss && <p className="mt-2 text-sm text-inkSoft">{wotd.gloss}</p>}
              {wotd.audio && (
                <div className="mt-4">
                  <PlayButton src={wotd.audio} size="sm" label={`${t("mod.play")} ${wotd.hanzi || wotd.headword}`} />
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="h3 mb-4">{t("mod.newest")}</h3>
            {newest.length ? (
              newest.map((r) => <Mini key={r.id} r={r} label={`${t("mod.play")} ${r.hanzi || r.headword}`} />)
            ) : (
              <p className="text-sm text-inkSoft">
                {t("mod.noRecordings")}{" "}
                <Link href="/improve?need=recording" className="link">
                  {t("mod.beFirst")}
                </Link>
              </p>
            )}
          </div>

          <div>
            <h3 className="h3 mb-4">{t("mod.requested")}</h3>
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
                    <div className="text-sm">{x.term}</div>
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
              <p className="text-sm text-inkSoft">
                {t("mod.nothingWaiting")}{" "}
                <Link href="/request" className="link">
                  {t("mod.askFor")}
                </Link>
              </p>
            )}
          </div>

          {top.length > 0 && (
            <div>
              <h3 className="h3 mb-4">{t("mod.top")}</h3>
              {top.map((p) => {
                const area = originArea(p.origin_area);
                return (
                  <Link key={p.id} href={`/contributor/${p.id}`} className="mini group">
                    <Avatar src={p.avatar_url} name={p.display_name} size={36} className="ring-1 ring-rule" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold group-hover:text-lacquer">
                        {p.display_name || "A contributor"}
                      </span>
                      <span className="block text-xs leading-[1.35] text-inkSoft">
                        {p.recordings === 1 ? t("mod.recording") : t("mod.recordings", { n: p.recordings })}
                        {area ? ` · ${area.label} ${area.hanzi}` : ""}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <hr className="rule-bleed" />

      {/* Assistant */}
      <section id="ask" className="sec scroll-mt-16">
        <p className="eyebrow">{t("ask.eyebrow")}</p>
        <h2 className="h1 mt-2">{t("ask.h")}</h2>
        <AskSection
          signedIn={!!user}
          samples={samples(lang)}
          s={{
            own: t("ask.own"),
            placeholderIn: t("ask.placeholder.in"),
            placeholderOut: t("ask.placeholder.out"),
            note: t("ask.note"),
            btn: t("ask.btn"),
            example: t("ask.example"),
            signin: t("ask.signin"),
            looking: t("ask.looking"),
          }}
        />
      </section>
    </div>
  );
}

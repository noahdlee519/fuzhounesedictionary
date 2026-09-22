import Link from "next/link";
import HeroMark from "@/components/HeroMark";
import SearchBar from "@/components/SearchBar";
import PlayButton from "@/components/PlayButton";
import AskSection, { type AskSample } from "@/components/AskSection";
import { entryCards, linkedEntryIds } from "@/lib/entry-cards";
import DeleteRequest from "@/components/DeleteRequest";
import RequestVote from "@/components/RequestVote";
import ContributorCard from "@/components/ContributorCard";
import { createClient } from "@/lib/supabase/server";
import type { SearchRow } from "@/lib/types";
import { one, recordingCounts, firstSense, audioCredit, type AudioCredit } from "@/lib/entries";
import { getSessionUser } from "@/lib/auth";
import { searchContributors, type ContributorHit } from "@/lib/contributors";
import { missionTally, topContributors, contributorCount, type MissionTally, type TopContributor } from "@/lib/public-stats";
import { translator, samples } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { getSafe } from "@/lib/safe";
import { isExplicit } from "@/lib/content-filter";
import Avatar from "@/components/Avatar";
import InfoTip from "@/components/InfoTip";

export const dynamic = "force-dynamic";

/* ---------------------------------------------------------------------------
   The home page, in the 9 Sep 2026 design. Without a query: the mission in
   two lines, the search, the assistant, two doors (speaker, learner), and
   three modules of live content.
   With a query: the search box and the results as rows.
   --------------------------------------------------------------------------- */

/* A string carrying one "[text](#id)" marker, rendered with that phrase as a
   link to somewhere else on this page. The marker is in the string rather than
   around it so a translation can put the linked phrase where its own grammar
   wants it. */
function anchored(text: string) {
  const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(text);
  if (!m) return text;
  return (
    <>
      {text.slice(0, m.index)}
      <a href={m[2]} className="link">{m[1]}</a>
      {text.slice(m.index + m[0].length)}
    </>
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
      {/* Words, not a ♪ glyph, so a screen reader says what the number is. */}
      <span className="shrink-0 text-xs text-inkMute">
        {recordings ? (recordings === 1 ? "1 recording" : `${recordings} recordings`) : "no recording"}
      </span>
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
  const { user, profile } = await getSessionUser();
  const isEditorView = Boolean(profile?.is_editor);
  const lang = getLang();
  const t = translator(lang);
  const safe = getSafe();

  const notices = (
    <>
      {searchParams.deleted && (
        <p role="status" className="wrap mb-6 rounded-sm border border-rule bg-surface px-5 py-3 text-sm text-inkSoft">
          Your account has been deleted. Thank you for everything you added.
        </p>
      )}
      {searchParams.auth_error && (
        <p role="alert" className="mb-6 rounded-sm border border-rule bg-surface px-5 py-3 text-sm text-inkSoft">
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
      /* The filter works on the meaning the search matched, so a word that
         also means something ordinary keeps its place and shows that other
         meaning; a word whose match is the explicit one drops out. */
      if (safe) rows = rows.filter((r) => !isExplicit(r.short_gloss));
      people = found;
      counts = await recordingCounts(supabase, rows.map((r) => r.id));
    } catch {
      errored = true;
    }
    /* Nothing found at all. The assistant is unfolded for someone signed in,
       where asking in words is the obvious next move; signed out it stays
       folded, because the panel is a long pitch that would bury the note
       below. */
    const nothingFound = !errored && rows.length === 0 && people.length === 0;

    return (
      <div className="-my-10 py-10">
        {notices}
        <SearchBar
          defaultValue={q}
          signedIn={!!user}
          assistant
          askOpen={nothingFound && !!user}
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
        {/* Nothing found. Rather than a dead end, the three ways on: the
            assistant (already unfolded above), adding the word, and the
            other dictionaries listed under Learn. */}
        {nothingFound && (
          <div className="mt-8 rounded-sm border border-rule bg-surface p-6 sm:p-7">
            <p className="h3">{t("results.none.h", { q })}</p>
            <p className="read mt-2 text-inkSoft">{t("results.none.p")}</p>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              <li className="text-inkSoft">{anchored(t("results.none.ask"))}</li>
              <li>
                <Link href={`/add?romanization=${encodeURIComponent(q)}`} className="link">
                  {t("results.none.add", { q })}
                </Link>
              </li>
              <li>
                <Link href="/learn?tab=reading" className="link">
                  {t("results.none.sources")}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------------- home */
  let tally: MissionTally | null = null;
  let wanted: { id: string; term: string; votes: number; entry_id: string | null }[] = [];
  let wotd: { id: string; hanzi: string | null; romanization: string | null; headword: string; audio: string | null; gloss: string | null; senses: number; credit?: AudioCredit | null } | null = null;
  let top: TopContributor[] = [];
  let people: number | null = null;
  const myVotes = new Set<string>();

  try {
    const [numbers, topPeople, peopleCount, { data: wants }] = await Promise.all([
      missionTally(),
      topContributors(4).catch(() => [] as TopContributor[]),
      contributorCount().catch(() => null),
      supabase
        .from("word_requests_ranked")
        .select("id, term, votes, entry_id")
        .eq("status", "open")
        .order("votes", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4),
    ]);
    tally = numbers;
    top = topPeople;
    people = peopleCount;
    wanted = (wants ?? []) as typeof wanted;
    // Which of these the viewer has voted for, so their ▲ shows it.
    if (user && wanted.length) {
      const { data: mv } = await supabase
        .from("word_request_votes")
        .select("request_id")
        .eq("user_id", user.id)
        .in("request_id", wanted.map((w) => w.id));
      for (const v of (mv ?? []) as any[]) myVotes.add(v.request_id);
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
        ? supabase.from("recordings").select("*").eq("entry_id", wotdId).eq("status", "approved").order("created_at").limit(1)
        : Promise.resolve({ data: null } as any),
    ]);
    if (w) {
      // Who recorded the take the card plays, for the tooltip on its button.
      const take = (wRec as any[])?.[0] ?? null;
      let by: string | null = null;
      if (take?.contributor_id) {
        const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", take.contributor_id).maybeSingle();
        by = (prof as any)?.display_name ?? null;
      }
      wotd = {
        id: w.id, hanzi: w.hanzi, romanization: w.romanization, headword: w.headword,
        audio: take?.audio_url ?? w.audio_url ?? null,
        credit: take ? audioCredit(by, take.speaker_name ?? null, take.origin_area ?? null) : null,
        gloss: firstSense<any>(w.senses)?.definition_en ?? null,
        senses: ((w.senses as any[]) ?? []).filter((x) => x?.definition_en).length,
      };
      // Rather than an explicit word standing at the top of the home page all
      // day, the module simply sits out; tomorrow's word takes its place.
      if (safe && isExplicit(wotd.gloss)) wotd = null;
    }
  } catch {
    /* the sections below simply skip what they did not get */
  }

  const words = tally?.words ?? 0;
  const voiced = tally?.voiced ?? 0;
  const silent = Math.max(0, words - voiced);
  const modules = [wotd, true, top.length > 0].filter(Boolean).length;

  // The example questions, each with cards for the words its written answer
  // links to, so a signed-out visitor sees what a real answer looks like.
  const baseSamples = samples(lang);
  let askSamples: AskSample[] = baseSamples;
  try {
    const ids = [...new Set(baseSamples.flatMap((x) => linkedEntryIds(x.a)))];
    const cards = await entryCards(ids, ids.length);
    const byId = new Map(cards.map((c) => [c.id, c]));
    askSamples = baseSamples.map((x) => ({
      ...x,
      cards: linkedEntryIds(x.a).map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    }));
  } catch {
    /* the examples simply show without cards */
  }

  return (
    <div className="-my-10">
      {(searchParams.deleted || searchParams.auth_error) && <div className="pt-6">{notices}</div>}

      {/* Hero, with the name of the language as a watermark (HeroMark). */}
      <section className="relative isolate pb-14 pt-20 max-[760px]:pb-9 max-[760px]:pt-11">
        <HeroMark />
        <div className="relative">
          <h1 className="display max-w-[24ch] [text-wrap:balance]">{t("hero.1")}</h1>
          <p className="lede read relative mt-6">
            {t("hero.lede.1")}
            <InfoTip id="dialect-tip" text={t("hero.tip")} />
            {t("hero.lede.2")}
          </p>
        </div>
      </section>

      {/* Search. The size of the dictionary sits over the box at the left,
          where it reads as a label for it; the line under the box is only
          what to try. */}
      <section className="relative pb-10">
        {words > 0 && <p className="footnote mb-2 px-1">{t("hint.count", { n: words.toLocaleString() })}</p>}
        <SearchBar
          signedIn={!!user}
          placeholderFull={t("search.full")}
          placeholderShort={t("search.short")}
          label={t("search.label")}
          hint={
            <>
              {t("hint.try")}{" "}
              {/* The other way to find something: the assistant, just below. */}
              <a href="#ask" className="whitespace-nowrap text-lacquer underline-offset-2 hover:underline">
                {t("hint.ask")}
              </a>
            </>
          }
        />
      </section>

      {/* The assistant, straight after search and in a panel of its own, so
          it reads as the second way to find something rather than a feature
          at the bottom of the page. Its field is as large as the search box;
          the panel and the heading are what tell the two apart. */}
      <section id="ask" className="scroll-mt-20 pb-14">
        <div className="rounded-sm bg-accentSoft p-6 sm:p-9">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="h2">{t("ask.eyebrow")}</h2>
            {/* What it is and where its answers come from, said plainly. */}
            <p className="meta text-inkFaint">
              <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-lacquer align-middle" />
              {t("ask.tag")}
            </p>
          </div>
          <p className="mt-2 max-w-[56ch] text-inkSoft [text-wrap:balance]">{t("ask.lede")}</p>
          <AskSection
            signedIn={!!user}
            samples={askSamples}
            s={{
              label: t("ask.eyebrow"),
              own: t("ask.own"),
              placeholderIn: t("ask.placeholder.in"),
              placeholderOut: t("ask.placeholder.out"),
              placeholderShort: t("ask.placeholder.short"),
              note: t("ask.note"),
              example: t("ask.example"),
              signin: t("ask.signin"),
              looking: t("ask.looking"),
              gate: t("ask.gate"),
            }}
          />
        </div>
      </section>

      <hr className="rule-bleed" />

      {/* The dictionary in four numbers (moved from About, Noah, 21 Sep 2026):
          words and recordings always; districts and contributors once there
          are any. Each label has a singular form for a count of one. */}
      {tally && (
        <>
          <section className="sec-sm">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
              {[
                [tally.words, "about.stat.words", "about.stat.word"],
                [tally.recordings, "about.stat.recs", "about.stat.rec"],
                [tally.districts, "about.stat.districts", "about.stat.district"],
                [people ?? 0, "about.stat.people", "about.stat.person"],
              ]
                .filter(([n], i) => i < 2 || (n as number) > 0)
                .map(([n, plural, single]) => (
                  <p key={plural as string}>
                    <span className="block text-[32px] font-medium leading-none tracking-tight tabular-nums text-ink sm:text-[40px]">
                      {(n as number).toLocaleString()}
                    </span>
                    <span className="mt-2 block text-sm text-inkSoft">{t((n === 1 ? single : plural) as any)}</span>
                  </p>
                ))}
            </div>
          </section>
          <hr className="rule-bleed" />
        </>
      )}

      {/* Two doors. The paragraphs are balanced so no line is left holding
          a single word at the widths where the column is narrow. */}
      <section className="sec">
        <div className="grid gap-14 md:grid-cols-2 max-[900px]:gap-11">
          <div>
            <p className="eyebrow">{t("nav.contribute")}</p>
            <h2 className="h1 mt-2">
              {t("door.contribute.h1")}
              <br />
              {t("door.contribute.h2")}
            </h2>
            <p className="mt-3 max-w-[38ch] text-inkSoft [text-wrap:balance]">{t("door.contribute.p")}</p>
            {tally && (
              <p className="mt-4 text-[13px] text-inkSoft">
                {t("door.contribute.counter", { silent: silent.toLocaleString(), voiced: voiced.toLocaleString() })
                  .split(/(\d[\d,]*)/)
                  .map((part, i) => (/^\d[\d,]*$/.test(part) ? <b key={i} className="font-medium text-lacquer">{part}</b> : part))}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/improve?need=recording" className="btn btn-primary">
                {t("door.contribute.btn")}
              </Link>
              <Link href="/add" className="btn btn-ghost">
                {t("door.contribute.link")}
              </Link>
            </div>
          </div>
          <div>
            <p className="eyebrow">{t("nav.learn")}</p>
            <h2 className="h1 mt-2">
              {t("door.learn.h1")}
              <br />
              {t("door.learn.h2")}
            </h2>
            <p className="mt-3 max-w-[38ch] text-inkSoft [text-wrap:balance]">{t("door.learn.p")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/learn" className="btn btn-primary">
                {t("door.learn.btn")}
              </Link>
              <Link href="/browse" className="btn btn-ghost">
                {t("door.learn.link")}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <hr className="rule-bleed" />

      {/* Three modules: the word of the day, what people are asking for,
          and who has given the most. */}
      <section className="sec">
        <div className={`grid gap-10 max-[900px]:grid-cols-2 max-[760px]:grid-cols-1 ${modules >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {/* The word itself is the point of this module, so it is drawn
              large, and the button is a loudspeaker rather than a play
              triangle: it plays a sound, not a video. */}
          {/* The whole card opens the word; the audio button sits above the
              card's link (z-10), so pressing it plays rather than navigates. */}
          {wotd && (
            <div className="group relative self-start rounded-sm bg-accentSoft p-6 transition-colors duration-200 hover:z-20 hover:bg-[var(--wotd-hover)] focus-within:z-20">
              <h3 className="h3 mb-3">{t("mod.wotd")}</h3>
              <Link
                href={`/entry/${wotd.id}`}
                className="block after:absolute after:inset-0 after:content-['']"
                aria-label={`${t("mod.wotd")}: ${wotd.hanzi ?? ""} ${wotd.romanization || wotd.headword}`}
              >
                {wotd.hanzi ? (
                  <div className="han text-[72px] font-medium leading-[1.05] transition-colors group-hover:text-lacquer">{wotd.hanzi}</div>
                ) : (
                  <div className="text-[44px] font-semibold leading-[1.1] tracking-tight transition-colors group-hover:text-lacquer">{wotd.romanization || wotd.headword}</div>
                )}
              </Link>
              <div className="mt-3 flex items-center gap-3">
                {wotd.audio && (
                  <span className="relative z-10">
                    <PlayButton src={wotd.audio} size="sm" label={`${t("mod.play")} ${wotd.hanzi || wotd.headword}`} credit={wotd.credit} />
                  </span>
                )}
                {wotd.hanzi && <span className="romanization text-[22px] leading-snug">{wotd.romanization || wotd.headword}</span>}
              </div>
              {/* The same size as the romanization above it. With more than one
                  meaning, the first is numbered and the rest are counted. */}
              {wotd.gloss && (
                <p className="mt-2 text-[22px] leading-snug text-inkSoft">
                  {wotd.senses > 1 && <span className="tabular-nums text-inkMute">1. </span>}
                  {wotd.gloss}
                </p>
              )}
              {wotd.senses > 1 && (
                <p className="mt-1.5 text-sm text-inkMute">
                  {t(wotd.senses === 2 ? "mod.moreMeanings1" : "mod.moreMeanings", { n: wotd.senses - 1 })}
                </p>
              )}
            </div>
          )}

          <div>
            <h3 className="h3 mb-4">{t("mod.requested")}</h3>
            {wanted.length ? (
              wanted.map((x) => (
                <div key={x.id} className="flex items-center gap-3 border-b border-rule py-2.5 last:border-b-0">
                  <RequestVote
                    id={x.id}
                    votes={x.votes}
                    voted={myVotes.has(x.id)}
                    signedIn={!!user}
                    back="/"
                    label={t("mod.votes", { n: x.votes })}
                  />
                  <div className="min-w-0 flex-1">
                    <Link href="/request" className="text-sm hover:text-lacquer">{x.term}</Link>
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
                      {isEditorView && <DeleteRequest id={x.id} back="/" />}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-inkSoft">{t("mod.nothingWaiting")}</p>
            )}
            <p className="mt-4">
              <Link href="/request" className="link text-sm">
                {t("mod.askFor")}
              </Link>
            </p>
          </div>

          {top.length > 0 && (
            <div>
              <h3 className="h3 mb-4">{t("mod.top")}</h3>
              {top.map((p) => {
                return (
                  <Link key={p.id} href={`/contributor/${p.id}`} className="mini group">
                    <Avatar src={p.avatar_url} name={p.display_name} size={36} className="ring-1 ring-rule" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold group-hover:text-lacquer">
                        {p.display_name || "A contributor"}
                      </span>
                      <span className="block text-xs leading-[1.35] text-inkSoft">
                        {p.recordings === 1 ? t("mod.recording") : t("mod.recordings", { n: p.recordings })}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Guide, { Contents, Sources } from "./Guide";
import { SHOW_GUIDE } from "./config";
import LearnPanels from "./LearnPanels";
import { learnPanels, panelAnchors } from "./panels";
import { starterWords, type StarterSection } from "./starter";
import PlayButton from "@/components/PlayButton";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learn Fuzhounese",
  description: SHOW_GUIDE
    ? "How Fuzhounese works: its seven tones, tone sandhi, initial assimilation, how it is written down, how it differs from Mandarin, a phrasebook, and every word in the dictionary A to Z."
    : "Fifty everyday Fuzhounese words with recordings, and how the language works—its tones, tone sandhi, measure words and how it is written—with the sources to read next.",
  alternates: { canonical: "/learn" },
};

/* The word list that used to sit under these panels is now /browse. Links
   from before the move carried its filters here; send them on. */
const LIST_PARAMS = ["page", "pos", "origin", "sort", "dir"] as const;

/* The Learn page, in the 9 Sep 2026 design: a hero, "How it works" as three
   chips that open the panels, then "Basic lessons" — the starter words in
   groups (the mock-up's phrasebook, drawn from the dictionary itself). */

export default async function LearnPage({
  searchParams,
}: {
  searchParams: { tab?: string } & Partial<Record<(typeof LIST_PARAMS)[number], string>>;
}) {
  const carried = LIST_PARAMS.filter((k) => searchParams[k]);
  if (carried.length) {
    const qs = new URLSearchParams(carried.map((k) => [k, searchParams[k] as string]));
    redirect(`/browse?${qs}#words`);
  }

  const lang = getLang();
  const t = translator(lang);
  let starter: StarterSection[] = [];
  try {
    starter = await starterWords();
  } catch {
    /* the section is simply left out */
  }
  const starterCount = starter.reduce((n, s) => n + s.words.length, 0);

  return (
    <div className="-my-10">
      <section className="pb-14 pt-20 max-[760px]:pb-9 max-[760px]:pt-11">
        <p className="eyebrow">{t("nav.learn")}</p>
        <h1 className="display mt-2 max-w-[26ch]">
          {t("learn.h1")}
          <br />
          {t("learn.h2")}
        </h1>
        <p className="lede read mt-6">{t("learn.lede")}</p>
        {/* Two chips to jump to the sections: the panels are long, and so is the word list. */}
        <div className="mt-6 flex flex-wrap gap-2">
          <a href="#how" className="chip">
            {t("learn.how.h")}
          </a>
          {starter.length > 0 && (
            <a href="#start" className="chip">
              {t("learn.start.h")}
            </a>
          )}
        </div>
        {SHOW_GUIDE && (
          <>
            <p className="read mt-6 text-[17px] leading-relaxed text-inkSoft">
              A dictionary can tell you what a word means. It cannot tell you that the word changes
              shape when you put another one after it, which in Fuzhounese it almost always does.
              This page is for that. Open whichever section you need.
            </p>
            <p className="read mt-3 text-[17px] leading-relaxed text-inkSoft">
              Everything here is sourced, and the sources are listed at the bottom. Where something
              has not been confirmed by a speaker, it says so.
            </p>
          </>
        )}
      </section>

      {SHOW_GUIDE && <Contents />}
      {SHOW_GUIDE && <Guide />}

      <hr className="rule-bleed" />
      <section id="how" className="sec scroll-mt-16">
        <h2 className="h2">{t("learn.how.h")}</h2>
        {/* Features · Orthography · Sources — one panel at a time,
            the first open on arrival. Content lives in panels.tsx. */}
        <div className="mt-6">
          <LearnPanels panels={learnPanels} anchors={panelAnchors} initial={searchParams.tab} />
        </div>
      </section>

      {starter.length > 0 && (
        <>
          <hr className="rule-bleed" />
          <section id="start" className="sec scroll-mt-16">
            <h2 className="h2">{t("learn.start.h")}</h2>
            <p className="read mt-3 text-inkSoft">{t("learn.start.lede", { n: starterCount })}</p>
            <div className="mt-8 grid gap-x-8 gap-y-10 min-[480px]:grid-cols-2 lg:grid-cols-3">
              {starter.map((g) => (
                // min-w-0: a grid column must not grow to fit a long gloss that truncates.
                <div key={g.key} className="min-w-0">
                  <h3 className="h3 mb-2">{t(g.label)}</h3>
                  {g.words.map((w) => (
                    <div key={w.id} className="mini">
                      {w.audio ? (
                        <PlayButton src={w.audio} size="xs" label={`${t("mod.play")} ${w.hanzi}`} />
                      ) : (
                        <span
                          className="inline-block h-9 w-9 shrink-0 rounded-full border border-dashed border-ruleStrong"
                          aria-hidden="true"
                        />
                      )}
                      <Link href={`/entry/${w.id}`} className="group min-w-0 flex-1">
                        <span className="han text-[19px] font-medium group-hover:text-lacquer">{w.hanzi}</span>{" "}
                        <span className="romanization text-xs text-inkSoft">{w.romanization}</span>
                        {(w.gloss || w.glossZh) && (
                          <span className="block truncate text-xs leading-[1.35] text-inkSoft">
                            {(lang === "zh" && w.glossZh) || w.gloss}
                          </span>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <hr className="rule-bleed" />
      <section className="sec-sm">
        <p className="text-inkSoft">
          {t("learn.browse")}{" "}
          <Link href="/browse" className="link">
            {t("learn.browse.link")}
          </Link>
        </p>
      </section>

      {SHOW_GUIDE && <Sources />}
    </div>
  );
}

import Link from "next/link";
import HeroMark from "@/components/HeroMark";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Guide, { Contents, Sources } from "./Guide";
import { SHOW_GUIDE } from "./config";
import LearnPanels from "./LearnPanels";
import { buildLearnPanels, panelAnchors } from "./panels";
import { starterWords, type StarterSection } from "./starter";
import PlayButton from "@/components/PlayButton";
import RecordPrompt from "@/components/RecordPrompt";
import { translator, pick } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { romText } from "@/lib/rom";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const L = pick(getLang());
  return {
    title: L("Learn Fuzhounese", "學福州話"),
    description: SHOW_GUIDE
      ? L(
          "How Fuzhounese works: its seven tones, tone sandhi, initial assimilation, how it is written down, how it differs from Mandarin, a phrasebook, and every word in the dictionary A to Z.",
          "福州話怎麼運作：七個聲調、連讀變調、聲母類化、怎麼書寫、和普通話有什麼不同、常用語手冊，以及辭典裡依字母排列的每一個詞。"
        )
      : L(
          "Fifty everyday Fuzhounese words with recordings, and how the language works—its tones, tone sandhi, measure words and how it is written—with the sources to read next.",
          "五十個附錄音的福州話日常詞，以及這個語言怎麼運作——聲調、連讀變調、量詞和書寫方式——還有延伸閱讀的資料來源。"
        ),
    alternates: { canonical: "/learn" },
  };
}

/* The word list that used to sit under these panels is now /browse. Links
   from before the move carried its filters here; send them on. */
const LIST_PARAMS = ["page", "pos", "origin", "sort", "dir"] as const;

/* The Learn page, in the 9 Sep 2026 design: a hero, "How it works" as three
   folder tabs over their panels, then "Basic lessons" — the starter words in
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
  const L = pick(lang);
  let starter: StarterSection[] = [];
  try {
    starter = await starterWords();
  } catch {
    /* the section is simply left out */
  }

  return (
    <div className="-my-10">
      <section className="relative isolate pb-14 pt-20 max-[760px]:pb-9 max-[760px]:pt-11">
        <HeroMark />
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
              {L(
                "A dictionary can tell you what a word means. It cannot tell you that the word changes shape when you put another one after it, which in Fuzhounese it almost always does. This page is for that. Open whichever section you need.",
                "辭典能告訴你一個詞是什麼意思，卻沒辦法告訴你：後面再接一個詞時，這個詞會變樣——在福州話裡幾乎總是如此。這一頁就是為此而寫的。需要哪一節，就打開哪一節。"
              )}
            </p>
            <p className="read mt-3 text-[17px] leading-relaxed text-inkSoft">
              {L(
                "Everything here is sourced, and the sources are listed at the bottom. Where something has not been confirmed by a speaker, it says so.",
                "這裡的每一項內容都有出處，資料來源列在頁尾。尚未經母語者確認的地方，會特別註明。"
              )}
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
          <LearnPanels panels={buildLearnPanels(lang)} anchors={panelAnchors} initial={searchParams.tab} />
        </div>
      </section>

      {starter.length > 0 && (
        <>
          <hr className="rule-bleed" />
          {/* data-back-zone: a word opened from here gets "Back to Basic lessons" (BackLink). */}
          <section id="start" data-back-zone="lessons" className="sec scroll-mt-16">
            <h2 className="h2">{t("learn.start.h")}</h2>
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
                        <RecordPrompt entryId={w.id} word={w.hanzi} size="xs" />
                      )}
                      <Link href={`/entry/${w.id}`} className="group min-w-0 flex-1">
                        <span className="han text-[19px] font-medium group-hover:text-lacquer">{w.hanzi}</span>{" "}
                        <span className="romanization text-xs text-inkSoft">{romText(w.romanization, w.romanization)}</span>
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

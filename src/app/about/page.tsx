import Link from "next/link";
import { recordingsTrusted } from "@/lib/trust";
import HeroMark from "@/components/HeroMark";
import SiniticTree from "@/components/SiniticTree";
import type { Metadata } from "next";
import ZoomMap from "@/components/ZoomMap";
import { FUJIAN_MAP } from "./fujian-map";
import { translator, type Key } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",  // the root layout appends " · Fuzhounese-English Dictionary"
  description:
    "The story behind the collaborative Fuzhounese-English dictionary, where Fuzhounese is spoken, how the dictionary is built, and the person who built it.",
  alternates: { canonical: "/about" },
};

/* The About page, in the 9 Sep 2026 design: Noah's story as the hero, the
   dictionary's numbers, the two maps under "Where it is spoken", how the
   dictionary is built beside the ways to help that are not recording, and
   the developer. */

export default async function AboutPage() {
  const lang = getLang();
  const t = translator(lang);

  /* A string with "[text](href)" links in it, rendered with the links in
     red. Internal paths go through next/link; mailto and http through <a>. */
  const rich = (text: string) => {
    const out: React.ReactNode[] = [];
    const re = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const [, label, href] = m;
      out.push(
        href.startsWith("/") ? (
          <Link key={m.index} href={href} className="link">{label}</Link>
        ) : (
          <a key={m.index} href={href} className="link">{label}</a>
        )
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };

  /* The same "[text](href)" marker, but split into the words before the
     phrase, the phrase, and the words after it, so a translator can put the
     marked phrase anywhere in the sentence. */
  const split = (text: string) => {
    const m = /\[([^\]]+)\]\([^)]+\)/.exec(text);
    if (!m) return { before: text, label: text, after: "" };
    return {
      before: text.slice(0, m.index),
      label: m[1],
      after: text.slice(m.index + m[0].length),
    };
  };

  const list = (keys: Key[], extra?: React.ReactNode) => (
    <ul className="mt-4">
      {keys.map((k) => (
        <li key={k} className="border-b border-rule py-3 leading-relaxed text-ink">
          {rich(t(k))}
        </li>
      ))}
      {extra && (
        <li className="border-b border-rule py-3 leading-relaxed text-ink">{extra}</li>
      )}
    </ul>
  );

  /* Places to find other people who speak it. All three are off this site, so
     they open in a new tab the way the developer's own links do. */
  const COMMUNITY: { key: Key; href: string }[] = [
    { key: "about.help.5.discord", href: "https://discord.gg/r9NAFS6Uvm" },
    { key: "about.help.5.fza", href: "https://www.fuzhouamerica.org/" },
    { key: "about.help.5.reddit", href: "https://www.reddit.com/r/ChineseLanguage/" },
  ];

  /* The last item on the help list folds open rather than linking out, on the
     same <details> idiom as the guide sections, so it needs no JavaScript. */
  const involved = split(t("about.help.5"));
  const community = (
    <details className="group">
      <summary className="cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
        {involved.before}
        <span className="link group-hover:underline">{involved.label}</span>
        {involved.after}
      </summary>
      <ul className="mt-2 space-y-1.5 border-l border-rule pl-4">
        {COMMUNITY.map((c) => (
          <li key={c.href}>
            <a href={c.href} target="_blank" rel="noreferrer" className="link text-[15px]">
              {t(c.key)}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );

  return (
    <article className="-my-10">
      {/* Hero: the story */}
      {/* On a screen wider than it is tall and at least 1024px, the story
          shares the hero with the family tree of Chinese (SiniticTree), and
          the 福州話 watermark steps aside for it. Elsewhere, the story alone. */}
      <section className="relative isolate z-10 pb-14 pt-20 max-[760px]:pb-9 max-[760px]:pt-11 landscape:lg:grid landscape:lg:grid-cols-[minmax(0,1fr)_300px] landscape:lg:gap-x-14">
        <HeroMark className="landscape:lg:hidden" />
        <div className="min-w-0">
          <p className="eyebrow">{t("nav.about")}</p>
          <h1 className="h1 mt-2 max-w-[30ch] [text-wrap:balance]">{t("about.h")}</h1>
          <p className="lede read mt-6 text-ink">{t("about.p1")}</p>
          <p className="read mt-5 text-[17px] leading-relaxed text-inkSoft">{t("about.p2")}</p>
          <p className="read mt-4 text-[17px] leading-relaxed text-inkSoft">{t("about.p3")}</p>
        </div>
        <aside className="hidden landscape:lg:block landscape:lg:pt-2">
          <SiniticTree
            caption={t("about.tree.caption")}
            legend={{
              north: t("about.tree.north"),
              central: t("about.tree.central"),
              south: t("about.tree.south"),
              min: t("about.tree.min"),
            }}
            sources={[
              { label: t("about.tree.src1"), href: "https://en.wikipedia.org/wiki/Language_Atlas_of_China" },
              { label: t("about.tree.src2"), href: "https://www.cambridge.org/9780521296533" },
            ]}
          />
        </aside>
      </section>

      <hr className="rule-bleed" />

      {/* Where it is spoken */}
      <section className="sec">
        <h2 className="h2">{t("about.where.h")}</h2>
        <p className="read mt-3 text-[17px] leading-relaxed text-inkSoft">{t("about.where.p")}</p>
        <div className="mt-10 grid items-center gap-x-12 gap-y-10 md:grid-cols-[2fr_3fr]">
          <figure>
            <div
              className="w-full [&>svg]:h-auto [&>svg]:w-full"
              // role and aria-label are on the <svg> root itself.
              dangerouslySetInnerHTML={{ __html: FUJIAN_MAP }}
            />
            <figcaption className="footnote mt-3">{t("about.map.fujian")}</figcaption>
          </figure>
          <figure>
            <ZoomMap
              src="/diaspora-map.svg"
              alt="World map of where Fuzhounese is spoken—Fuzhou in eastern Fujian, China, and diaspora communities in New York, Toronto, London, Tokyo, Kuala Lumpur, Singapore, Sibu, Jakarta and Sydney."
              width={520}
              height={264}
            />
            <figcaption className="footnote mt-3">{t("about.map.world")}</figcaption>
          </figure>
        </div>
      </section>
      <hr className="rule-bleed" />

      {/* How it is built · other ways to help */}
      <section className="sec">
        <div className="grid gap-14 md:grid-cols-2 max-[900px]:gap-11">
          <div>
            <h2 className="h2">{t("about.built.h")}</h2>
            {list(["about.built.1", recordingsTrusted() ? "about.built.2.trust" : "about.built.2", "about.built.3", "about.built.4"])}
          </div>
          <div>
            <h2 className="h2">{t("about.help.h")}</h2>
            {list(["about.help.2", "about.help.3", "about.help.4"], community)}
          </div>
        </div>
      </section>
      <hr className="rule-bleed" />

      {/* The developer */}
      <section className="sec-sm">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/noah.jpg"
            alt="Noah Lee"
            width={144}
            height={144}
            className="h-36 w-36 shrink-0 rounded-sm object-cover ring-1 ring-rule"
          />
          <div>
            <p className="eyebrow">{t("about.dev")}</p>
            <h2 className="h2 mt-2">Noah Lee</h2>
            <p className="mt-2 max-w-[52ch] text-inkSoft">{t("about.dev.p")}</p>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <a href="mailto:noahlee519@gmail.com" className="link">
                noahlee519@gmail.com
              </a>
              <span aria-hidden="true" className="text-ruleStrong">|</span>
              <a href="https://noahdarwinlee.com" target="_blank" rel="noreferrer" className="link">
                noahdarwinlee.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}

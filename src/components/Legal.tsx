import Link from "next/link";
import { pick, type Lang } from "@/lib/i18n";

/* Shared layout for the privacy policy and terms of service: a heading, the
   date it was last changed, and numbered sections in the site's own voice.
   Takes the language as a prop rather than reading the cookie itself, so this
   module stays free of next/headers (EditorInviteBanner imports LEGAL_CONTACT). */

export const LEGAL_CONTACT = "noahdlee519@gmail.com";

export function LegalPage({
  title,
  updated,
  intro,
  children,
  other,
  lang,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
  /** The companion document to point at from the foot of this one. */
  other: "privacy" | "terms";
  lang: Lang;
}) {
  const L = pick(lang);
  return (
    <article className="space-y-10">
      <section className="border-b border-rule pb-6">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 meta text-inkFaint">
          {L("Last updated {d}", "最後更新：{d}", { d: updated })}
        </p>
        {lang === "zh" && (
          <p className="mt-2 text-sm text-inkFaint">
            本中文譯本僅供參考，如與英文版本有出入，以英文版本為準。
          </p>
        )}
        <div className="mt-5 max-w-[68ch] space-y-3 text-lg leading-relaxed text-inkSoft">{intro}</div>
      </section>
      <div className="max-w-[68ch] space-y-8">{children}</div>
      <p className="border-t border-rule pt-5 text-sm text-inkFaint">
        {L("Questions about either document: ", "對這兩份文件有任何疑問，請寄信至 ")}
        <a href={`mailto:${LEGAL_CONTACT}`} className="text-lacquer hover:underline">
          {LEGAL_CONTACT}
        </a>
        {L(". See also the ", "。另請參閱")}
        {other === "privacy" ? (
          <Link href="/privacy" className="text-lacquer hover:underline">{L("privacy policy", "《隱私權政策》")}</Link>
        ) : (
          <Link href="/terms" className="text-lacquer hover:underline">{L("terms of service", "《服務條款》")}</Link>
        )}
        {L(".", "。")}
      </p>
    </article>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-baseline gap-3 font-display text-lg font-bold tracking-tight">
        <span className="text-xs font-normal tabular-nums text-inkFaint">
          {String(n).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed text-inkSoft">{children}</div>
    </section>
  );
}

export const Ul = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc space-y-1.5 pl-5 marker:text-lacquer">{children}</ul>
);

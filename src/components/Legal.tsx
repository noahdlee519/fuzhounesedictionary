import Link from "next/link";

/* Shared layout for the privacy policy and terms of service: a heading, the
   date it was last changed, and numbered sections in the site's own voice. */

export const LEGAL_CONTACT = "noahdlee519@gmail.com";

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="space-y-10">
      <section className="border-b border-rule pb-6">
        <h1 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
          Last updated {updated}
        </p>
        <div className="mt-5 max-w-[68ch] space-y-3 text-lg leading-relaxed text-inkSoft">{intro}</div>
      </section>
      <div className="max-w-[68ch] space-y-8">{children}</div>
      <p className="border-t border-rule pt-5 text-sm text-inkFaint">
        Questions about either document:{" "}
        <a href={`mailto:${LEGAL_CONTACT}`} className="text-lacquer hover:underline">
          {LEGAL_CONTACT}
        </a>
        . See also the <Link href="/privacy" className="text-lacquer hover:underline">privacy policy</Link>{" "}
        and the <Link href="/terms" className="text-lacquer hover:underline">terms of service</Link>.
      </p>
    </article>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-baseline gap-3 font-display text-lg font-bold uppercase tracking-tight">
        <span className="font-mono text-xs font-normal tabular-nums text-inkFaint">
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

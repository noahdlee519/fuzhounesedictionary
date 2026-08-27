import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About · Fuzhounese Dictionary",
  description:
    "The story behind the first-ever collaborative digital Fuzhounese dialect dictionary, and the person who built it.",
};

export default function AboutPage() {
  return (
    <article className="space-y-12">
      <section className="border-b border-rule pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-lacquer">關於 · About</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
          About this project
        </h1>
      </section>

      <section className="max-w-[62ch] space-y-6">
        <p className="font-display text-2xl font-semibold leading-snug text-ink sm:text-3xl">
          This is the first-ever collaborative digital Fuzhounese dialect dictionary.
        </p>

        <p className="text-lg leading-relaxed text-inkSoft">
          As Mandarin grows in use throughout China, the many local dialects of Chinese are quietly
          being wiped away. Fuzhounese is the language my mother&apos;s side of the family speaks — and
          fewer and fewer people speak it today.
        </p>

        <p className="text-lg leading-relaxed text-inkSoft">
          A few years ago, I built the first online dictionary for the dialect, with English and
          Mandarin translations, and I continue to maintain it. Since then, people from around the
          world have contributed, and watching the project grow has been one of the most fulfilling
          things I&apos;ve been part of.
        </p>

        <p className="text-lg leading-relaxed text-inkSoft">
          My goal with this website is to help preserve the language — and to make it a resource for
          anyone who wants to learn Fuzhounese.
        </p>
      </section>

      <section className="border-t border-rule pt-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <img
            src="/noah.jpg"
            alt="Noah Lee"
            width={160}
            height={160}
            className="h-40 w-40 shrink-0 border border-rule object-cover"
          />
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lacquer">Creator &amp; maintainer</p>
            <h2 className="font-display text-2xl font-bold tracking-tight">Noah Lee</h2>
            <p className="max-w-[46ch] text-inkSoft">
              Noah started this dictionary a few years ago to document the Fuzhounese his mother&apos;s
              family speaks. He builds and maintains the site, reviews the words people contribute, and
              keeps the project growing.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}

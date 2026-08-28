import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About · Fuzhounese Dictionary",
  description:
    "The story behind the collaborative Fuzhounese-English dictionary, and the person who built it.",
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
        <p className="font-display text-2xl font-semibold leading-snug text-balance text-ink sm:text-3xl">
          As Mandarin grows in use throughout China, the many local dialects of Chinese are fading away.
        </p>

        <p className="text-lg leading-relaxed text-inkSoft">
          Fuzhounese is the dialect my grandmother speaks, and my goal with this website is to help
          preserve the language — and to make it a resource for anyone who wants to learn Fuzhounese.
        </p>

        <p className="text-lg leading-relaxed text-inkSoft">
          This dictionary has English and Mandarin translations, audio recordings and Chinese characters,
          romanization (<span className="romanization">Bàng-uâ-cê</span>), and — most importantly — an
          emphasis on community collaboration. It&apos;s also completely free to use.
        </p>

        <p className="text-lg leading-relaxed text-inkSoft">
          Since I started this project in 2021, people from around the world have contributed words to
          the dictionary. Fuzhounese takes on many forms, and some words are pronounced differently by
          different speakers — so even if a word already has an entry, don&apos;t hesitate to add your
          variant too.
        </p>

        <p className="pt-2">
          <Link
            href="/submit"
            className="inline-block border border-lacquer bg-lacquer px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper transition-colors hover:bg-transparent hover:text-lacquer"
          >
            Add a word →
          </Link>
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
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lacquer">Creator</p>
            <h2 className="font-display text-2xl font-bold tracking-tight">Noah Lee</h2>
            <p className="max-w-[46ch] text-inkSoft">
              Noah started this dictionary in 2021 to help preserve the Fuzhounese his grandmother
              speaks. He builds and maintains the site and reviews the words people contribute.
            </p>
            <p>
              <a
                href="mailto:noahlee519@gmail.com"
                className="inline-block font-mono text-xs uppercase tracking-wide text-lacquer hover:underline"
              >
                noahlee519@gmail.com
              </a>
              <span className="mx-2 text-inkFaint">·</span>
              <a
                href="https://noahdarwinlee.com"
                target="_blank"
                rel="noreferrer"
                className="inline-block font-mono text-xs uppercase tracking-wide text-lacquer hover:underline"
              >
                noahdarwinlee.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}

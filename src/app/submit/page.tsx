import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import SubmitForm from "./SubmitForm";
import ContributeTabs from "@/components/ContributeTabs";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add a word",
  description:
    "Contribute a Fuzhounese word: characters, romanization, meanings, a recording, and where your variant is from.",
  alternates: { canonical: "/submit" },
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: { romanization?: string; success?: string };
}) {
  const { user } = await getSessionUser();

  if (searchParams.success) {
    return (
      <div className="space-y-8">
        <ContributeTabs active="add" />
        <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-rule bg-surface p-8 text-center">
          <p className="h2">Thank you</p>
          <p className="text-inkSoft">
            Your word is in the review queue. An editor will read it before it goes live, and it will
            show on your account page meanwhile.
          </p>
          <div className="flex flex-wrap justify-center gap-5 text-sm">
            <Link href="/submit" className="link">Add another</Link>
            <Link href="/improve" className="link">Improve a word</Link>
            <Link href="/account" className="link">My submissions</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <ContributeTabs active="add" />
        {/* The pitch before the wall: what helping looks like and how long
            each kind takes, so a speaker can see why the sign-in is worth it. */}
        <div className="grid gap-6 sm:grid-cols-[1fr_20rem] sm:gap-10">
          <div className="space-y-5">
            <p className="max-w-[56ch] text-[17px] leading-relaxed text-inkSoft">
              If you speak Fuzhounese, sign in and contribute any words, definitions and recordings
              you&apos;d like. Everything is checked by an editor before it appears, and credited to
              you.
            </p>
            <ul className="space-y-4">
              {[
                ["Record a word", "About thirty seconds", "Pick a word that has no recording yet and say it into your phone or laptop.", "/improve?need=recording"],
                ["Add a word", "About two minutes", "A word you know that is not here: characters or romanization, one English meaning, and a recording if you like.", "/submit"],
                ["Improve a word", "Ten seconds to a minute", "Add a pronunciation or an example sentence to a word that is missing one, or upvote the words people are waiting for.", "/improve"],
              ].map(([title, time, text, href]) => (
                <li key={title} className="grid gap-x-4 gap-y-1 border-t border-rule pt-3 sm:grid-cols-[11rem_1fr]">
                  <div>
                    <Link href={href} className="link font-semibold">{title}</Link>
                    <p className="text-xs text-inkMute">{time}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-inkSoft">{text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 self-start rounded-xl border border-rule bg-surface p-6">
            <p className="h3">Sign in to start</p>
            <p className="text-sm text-inkSoft">
              A Google account is all it takes. It is how a word is credited to you and how an
              editor can reach you about it.
            </p>
            <SignInButton next="/submit" label={translator(getLang())("signin.google")} />
            <p className="text-xs text-inkFaint">
              By contributing you agree to the{" "}
              <Link href="/terms" className="underline hover:text-lacquer">terms</Link> and license
              your work CC BY-SA 4.0.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("origin_area, origin_locality, is_editor")
    .eq("id", user.id)
    .maybeSingle();
  const originArea = profile?.origin_area ?? "";
  const originLocality = profile?.origin_locality ?? "";

  return (
    <div className="space-y-6">
      <ContributeTabs active="add" />
      <p className="max-w-[60ch] text-[17px] leading-relaxed text-inkSoft">
        A word you know that is not here yet. Fill in what you can—only the word and one English
        meaning are required—and say it into the microphone if you are able. An editor reads it
        before it appears.
      </p>
      <SubmitForm
        userId={user.id}
        isEditor={Boolean(profile?.is_editor)}
        initialRomanization={searchParams.romanization ?? ""}
        defaultOriginArea={originArea}
        defaultOriginLocality={originLocality}
      />
    </div>
  );
}

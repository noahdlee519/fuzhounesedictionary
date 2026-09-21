import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInGate from "@/components/SignInGate";
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
        <div className="max-w-lg space-y-4 rounded-sm border border-rule bg-surface p-8">
          <p className="h2">Thank you</p>
          <p className="text-inkSoft">
            Your word is in the review queue. An editor will read it before it goes live, and it will
            show on your account page meanwhile.
          </p>
          <div className="flex flex-wrap gap-5 text-sm">
            <Link href="/submit" className="link">Add another word</Link>
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
        <SignInGate
          kind="add"
          title="Sign in to add a word"
          text="Add a word you know that is not here yet: its characters or romanization, one English meaning, and a recording if you like. An editor reads it before it appears, and it is credited to you."
          next="/submit"
        />
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

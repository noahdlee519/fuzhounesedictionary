import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInGate from "@/components/SignInGate";
import SubmitForm from "./SubmitForm";
import ContributeTabs from "@/components/ContributeTabs";
import type { Metadata } from "next";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add a word",
  description:
    "Contribute a Fuzhounese word: characters, romanization, meanings, a recording, and where your variant is from.",
  alternates: { canonical: "/add" },
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: { romanization?: string; success?: string };
}) {
  const L = pick(getLang());
  const { user, profile: me } = await getSessionUser();

  if (searchParams.success) {
    return (
      <div className="space-y-8">
        <ContributeTabs active="add" />
        <div className="max-w-lg space-y-4 rounded-sm border border-rule bg-surface p-8">
          <p className="h2">{L("Thank you", "謝謝你")}</p>
          <p className="text-inkSoft">
            {me?.is_editor
              ? L("Your word is published—as an editor, what you add goes live straight away.", "你的詞已經刊出——你是編輯，新增的內容會直接上線。")
              : L("Your word is in the review queue. An editor will read it before it goes live, and it will show on your account page meanwhile.", "你的詞已進入審核佇列。編輯看過後才會上線，在此之前可以在你的帳號頁看到它。")}
          </p>
          <div className="flex flex-wrap gap-5 text-sm">
            <Link href="/add" className="link">{L("Add another word", "再新增一個詞")}</Link>
            <Link href="/account" className="link">{L("My submissions", "我的投稿")}</Link>
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
          title={L("Sign in to add a word", "登入後即可新增詞條")}
          text={L("Add a word you know that is not here yet: its characters or romanization, one English meaning, and a recording if you like. An editor reads it before it appears, and it is credited to you.", "把你知道、辭典裡還沒有的詞加進來：寫上漢字或羅馬字、一個英文意思，想錄音也可以。編輯看過後才會刊出，並會註明是你的貢獻。")}
          next="/add"
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
        {L(
          "A word you know that is not here yet. Fill in what you can—only the word and one English meaning are required—and say it into the microphone if you are able. An editor reads it before it appears.",
          "一個你知道、這裡還沒有的詞。知道多少就填多少——只有詞本身和一個英文意思是必填的——可以的話，也對著麥克風講一次。編輯看過後才會刊出。"
        )}
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

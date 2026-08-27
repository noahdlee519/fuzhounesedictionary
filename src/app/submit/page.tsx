import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";
import SubmitForm from "./SubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: { romanization?: string; success?: string };
}) {
  const { user } = await getSessionUser();

  if (searchParams.success) {
    return (
      <div className="mx-auto max-w-lg space-y-4 border-l-2 border-lacquer bg-surface p-8 text-center">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">Thank you</h1>
        <p className="text-inkSoft">
          Your word was submitted and is now in the review queue. An editor will look at it before it goes live.
        </p>
        <div className="flex justify-center gap-5 font-mono text-xs uppercase tracking-wide">
          <Link href="/submit" className="text-lacquer hover:underline">Add another</Link>
          <Link href="/account" className="text-lacquer hover:underline">My submissions</Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 border border-rule bg-surface p-8 text-center">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">Add a word</h1>
        <p className="text-inkSoft">
          Please sign in to contribute. This helps us keep the dictionary trustworthy and credit your contributions.
        </p>
        <div className="flex justify-center">
          <SignInButton next="/submit" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="border-b border-rule pb-4">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">Add a word</h1>
        <p className="mt-2 text-inkSoft">
          Fill in whatever you know — only the word (characters or romanization) and at least one English meaning
          are required. Submissions are reviewed before they appear.
        </p>
      </div>
      <SubmitForm userId={user.id} initialRomanization={searchParams.romanization ?? ""} />
    </div>
  );
}

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
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:bg-green-950/40 dark:border-green-900">
        <h1 className="font-serif text-2xl font-bold text-green-800 dark:text-green-300">Thank you! 🎉</h1>
        <p className="text-green-800 dark:text-green-300">
          Your word was submitted and is now in the review queue. An editor will look at it before it
          goes live.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/submit" className="font-medium text-accent hover:underline">Add another</Link>
          <Link href="/account" className="font-medium text-accent hover:underline">My submissions</Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-stone-200 bg-white p-8 text-center dark:bg-stone-900 dark:border-stone-700">
        <h1 className="font-serif text-2xl font-bold">Add a word</h1>
        <p className="text-stone-600 dark:text-stone-300">
          Please sign in to contribute. This helps us keep the dictionary trustworthy and credit your
          contributions.
        </p>
        <div className="flex justify-center">
          <SignInButton next="/submit" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Add a word</h1>
        <p className="mt-1 text-stone-600 dark:text-stone-400">
          Fill in whatever you know — only the word (characters or romanization) and at least one
          English meaning are required. Submissions are reviewed before they appear.
        </p>
      </div>
      <SubmitForm userId={user.id} initialRomanization={searchParams.romanization ?? ""} />
    </div>
  );
}

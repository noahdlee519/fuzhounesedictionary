import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import SignInButton from "./SignInButton";

export default async function Header() {
  const { user, profile } = await getSessionUser();

  return (
    <header className="border-b border-stone-200 bg-white/70 backdrop-blur dark:border-stone-700 dark:bg-black/20">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="font-serif text-xl font-bold text-accent">
          福州話 <span className="text-ink dark:text-stone-100">Fuzhounese Dictionary</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-accent">Search</Link>
          <Link href="/browse" className="hover:text-accent">Browse</Link>
          <Link href="/wanted" className="hover:text-accent">Wanted</Link>
          <Link
            href="/submit"
            className="rounded-full bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            + Add a word
          </Link>
          {profile?.is_editor && (
            <Link href="/admin" className="hover:text-accent">Queue</Link>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/account" className="hover:text-accent">
                {profile?.display_name || "My words"}
              </Link>
              <form action="/auth/signout" method="post">
                <button className="text-stone-400 hover:text-accent">Sign out</button>
              </form>
            </div>
          ) : (
            <SignInButton
              className="rounded-full border border-stone-300 px-3 py-1.5 font-medium hover:border-accent"
              label="Sign in"
            />
          )}
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import SignInButton from "./SignInButton";

export default async function Header() {
  const { user, profile } = await getSessionUser();

  const navLink = "text-inkSoft transition-colors hover:text-lacquer";

  return (
    <header className="relative z-10 border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold leading-none tracking-tight text-lacquer">福州話</span>
          <span className="font-display text-base font-semibold lowercase tracking-tight text-ink">fuzhounese.org</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
          <Link href="/" className={navLink}>Search</Link>
          <Link href="/learn" className={navLink}>Learn</Link>
          <Link href="/about" className={navLink}>About</Link>
          <Link href="/request" className={navLink}>Request</Link>
          {user && <Link href="/record" className={navLink}>Record</Link>}
          {profile?.is_editor && <Link href="/admin" className={navLink}>Queue</Link>}
          <Link
            href="/submit"
            className="border border-lacquer bg-lacquer px-3 py-1 text-[15px] text-paper transition-colors hover:bg-transparent hover:text-lacquer"
          >
            + Add a word
          </Link>
          {user ? (
            <span className="flex items-center gap-4">
              <Link href="/account" className={navLink}>{profile?.display_name || "My words"}</Link>
              <form action="/auth/signout" method="post">
                <button className="text-inkFaint transition-colors hover:text-lacquer">Sign out</button>
              </form>
            </span>
          ) : (
            <SignInButton
              className="border border-rule px-3 py-1 text-[15px] text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer"
              label="Sign in"
            />
          )}
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import SignInButton from "./SignInButton";
import Avatar from "./Avatar";

export default async function Header() {
  const { user, profile } = await getSessionUser();

  const navLink = "text-inkSoft transition-colors hover:text-lacquer";

  return (
    <header className="relative z-10 border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-4xl items-center gap-x-6 px-5 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold leading-none tracking-tight text-lacquer">福州話</span>
          <span className="font-display text-base font-semibold lowercase tracking-tight text-ink">fuzhounese.org</span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-2 text-[15px]">
          <Link href="/" className={navLink}>Search</Link>
          <Link href="/learn" className={navLink}>Learn</Link>
          <Link href="/about" className={navLink}>About</Link>
          <Link href="/request" className={navLink}>Request</Link>
          {user && <Link href="/improve" className={navLink}>Improve</Link>}
          {profile?.is_editor && <Link href="/admin" className={navLink}>Queue</Link>}
          <Link
            href="/submit"
            className="border border-lacquer bg-lacquer px-3 py-1 text-[15px] text-paper transition-colors hover:bg-transparent hover:text-lacquer"
          >
            + Add a word
          </Link>
          {user ? (
            <Link
              href="/account"
              aria-label="Your account"
              title={profile?.display_name || "Your account"}
              className="ml-1 inline-flex rounded-full"
            >
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name}
                size={32}
                className="ring-1 ring-rule transition hover:ring-lacquer"
              />
            </Link>
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

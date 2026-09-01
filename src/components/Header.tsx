import { getSessionUser } from "@/lib/auth";
import NavLink from "./NavLink";
import SignInButton from "./SignInButton";
import Avatar from "./Avatar";

export default async function Header() {
  const { user, profile } = await getSessionUser();

  // NavLink supplies the colour: lacquer for the page you are on, ink for the rest.
  const navLink = "transition-colors";

  return (
    <header className="relative z-10 border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-4xl items-center gap-x-6 px-5 py-4">
        <NavLink href="/" plain announce={false} className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold leading-none tracking-tight text-lacquer">福州話</span>
          <span className="font-display text-base font-semibold lowercase tracking-tight text-ink">fuzhounese.org</span>
        </NavLink>
        <nav className="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-2 text-[15px]">
          <NavLink href="/" className={navLink}>Search</NavLink>
          <NavLink href="/learn" className={navLink}>Learn</NavLink>
          <NavLink href="/about" className={navLink}>About</NavLink>
          <NavLink href="/request" className={navLink}>Request</NavLink>
          {user && <NavLink href="/improve" className={navLink}>Improve</NavLink>}
          {profile?.is_editor && <NavLink href="/admin" className={navLink}>Queue</NavLink>}
          {/* plain: its text is paper on lacquer, so red text would be invisible. */}
          <NavLink
            href="/submit"
            plain
            className="border border-lacquer bg-lacquer px-3 py-1 text-[15px] text-paper transition-colors hover:bg-transparent hover:text-lacquer"
          >
            + Add a word
          </NavLink>
          {user ? (
            <NavLink
              href="/account"
              plain
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
            </NavLink>
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

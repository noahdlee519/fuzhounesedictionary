import { getSessionUser } from "@/lib/auth";
import NavLink from "./NavLink";
import SignInButton from "./SignInButton";
import Avatar from "./Avatar";

/* The header is one row on a laptop and two on a phone or small tablet.

   Below the `md` breakpoint (768px) there is no room for six links and two
   buttons beside the wordmark, and letting them wrap produced a header three
   or four lines tall. So there the wordmark shares its line with just the two
   buttons — "+ Add" and the account — and the text links move to a slim strip
   underneath. The strip scrolls sideways if it must (an editor sees six links;
   a visitor sees four, which fit on any phone), with the scrollbar hidden and
   the strip bleeding to the screen edges so a cut-off word says "more here".

   Sizes step down separately at `sm` (640px): below it the wordmark is a size
   smaller, the button reads "+ Add" and the Google mark comes off "Sign in",
   which is what lets the top row fit on a 360px screen.

   The same elements are rendered once and reordered with flex `order`, so the
   two layouts cannot drift apart. */

type SessionShape = Awaited<ReturnType<typeof getSessionUser>>;

export default async function Header() {
  const session = await getSessionUser();
  return <HeaderView {...session} />;
}

/* Presentational half, exported so the layout can be rendered with a chosen
   session state (signed out / member / editor) without a real sign-in. */
export function HeaderView({ user, profile }: SessionShape) {
  // NavLink supplies the colour: lacquer for the page you are on, ink for the rest.
  const navLink = "transition-colors";

  return (
    <header className="relative z-10 border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 px-5 py-3 sm:py-4 md:gap-x-5 lg:gap-x-6">
        {/* 1. Wordmark — a touch smaller on a phone so the buttons fit beside it. */}
        <NavLink
          href="/"
          plain
          announce={false}
          className="order-1 flex shrink-0 items-baseline gap-1.5 sm:gap-2"
        >
          <span className="font-display text-xl font-extrabold leading-none tracking-tight text-lacquer sm:text-2xl">
            福州話
          </span>
          {/* Fits beside the buttons from 360px up; on anything narrower the
              domain goes rather than the buttons wrapping onto a third line. */}
          <span className="hidden font-display text-sm font-semibold lowercase tracking-tight text-ink min-[360px]:inline sm:text-base">
            fuzhounese.org
          </span>
        </NavLink>

        {/* 2. Text links. Narrow: a strip on its own line beneath the wordmark
              (basis-full puts it there; grow lets it absorb the negative margins
              and reach both screen edges). Wide: back in the row, right-aligned
              against the buttons. Keyboard users tab through the links before the
              buttons on both layouts. */}
        <nav
          aria-label="Site"
          className="nav-strip order-3 -mx-5 mt-3 flex grow basis-full items-center gap-x-5 overflow-x-auto whitespace-nowrap px-5 text-[15px] md:order-2 md:mx-0 md:mt-0 md:basis-auto md:justify-end md:gap-x-4 md:overflow-visible md:px-0 lg:gap-x-5"
        >
          <NavLink href="/" className={navLink}>Search</NavLink>
          <NavLink href="/learn" className={navLink}>Learn</NavLink>
          <NavLink href="/about" className={navLink}>About</NavLink>
          <NavLink href="/request" className={navLink}>Request</NavLink>
          {user && <NavLink href="/improve" className={navLink}>Improve</NavLink>}
          {profile?.is_editor && <NavLink href="/admin" className={navLink}>Queue</NavLink>}
        </nav>

        {/* 3. The two buttons. Narrow: ride on the wordmark's line, right-aligned.
              Wide: end of the row. */}
        <div className="order-2 ml-auto flex shrink-0 items-center gap-x-2 text-sm sm:gap-x-4 sm:text-[15px] md:order-3 lg:gap-x-5">
          {/* plain: its text is paper on lacquer, so red text would be invisible. */}
          <NavLink
            href="/submit"
            plain
            className="border border-lacquer bg-lacquer px-2.5 py-1 text-paper sm:px-3 transition-colors hover:bg-transparent hover:text-lacquer"
          >
            <span className="sm:hidden">+ Add</span>
            <span className="hidden sm:inline">+ Add a word</span>
          </NavLink>
          {user ? (
            <NavLink
              href="/account"
              plain
              aria-label="Your account"
              title={profile?.display_name || "Your account"}
              className="inline-flex rounded-full"
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
              // The Google mark is hidden on a phone: with it, the button does
              // not fit beside the wordmark on a 360px screen.
              className="inline-flex items-center gap-1.5 whitespace-nowrap border border-rule px-2.5 py-1 text-inkSoft sm:px-3 transition-colors hover:border-lacquer hover:text-lacquer [&>svg]:hidden sm:[&>svg]:block"
              label="Sign in"
            />
          )}
        </div>
      </div>
    </header>
  );
}

import { getSessionUser } from "@/lib/auth";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import NavLink from "./NavLink";
import SignInButton from "./SignInButton";
import Avatar from "./Avatar";
import HeaderSearch from "./HeaderSearch";
import LangToggle from "./LangToggle";
import ThemeToggle from "./ThemeToggle";

/* The header, after the 9 Sep 2026 redesign: one 56px row, sticky, with a
   frosted background so the page shows through as it scrolls under it.

   Wide:   wordmark · Browse Learn Contribute About · EN/中文 · ☾ … search · Sign in
   Narrow: wordmark … search · Sign in
           Browse Learn Contribute About … EN/中文 · ☾

   The same elements at every width, reordered with flex `order`, so the two
   layouts cannot drift apart. */

type SessionShape = Awaited<ReturnType<typeof getSessionUser>>;

export default async function Header() {
  const session = await getSessionUser();
  return <HeaderView {...session} />;
}

/* Presentational half, exported so the layout can be rendered with a chosen
   session state (signed out / member / editor) without a real sign-in. */
export function HeaderView({ user, profile }: SessionShape) {
  const lang = getLang();
  const t = translator(lang);
  /* The links are set tight on a phone, where the row is full at four of
     them plus the toggles, and given air as soon as there is any: the nav
     grows into whatever the search leaves and spreads them evenly. */
  const navLink =
    "rounded-lg px-1.5 py-2 text-[13px] font-medium leading-none transition-colors sm:px-2.5 md:px-3 md:text-sm";

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-[var(--header-bg)] backdrop-blur-[20px] backdrop-saturate-[180%]">
      <div className="wrap flex flex-wrap items-center gap-x-3 md:h-14 md:flex-nowrap md:gap-x-5">
        {/* 1. Wordmark. The two words share a baseline inside a box that is
            centred in the row, so the characters sit level at every width. */}
        <NavLink
          href="/"
          plain
          announce={false}
          className="order-1 flex h-14 shrink-0 items-center md:h-auto"
        >
          <span className="inline-flex items-baseline gap-2 whitespace-nowrap font-bold tracking-tight">
            {/* 福州 and "fuzhou" — the place — in lacquer; 話 and the rest in ink. */}
            <span className="han text-[17px] font-bold leading-none">
              <span className="text-lacquer">福州</span>話
            </span>
            {/* The domain is the first thing to go when the row is tight — below
                920px there is no room for it beside a usable search box. */}
            <span className="hidden text-sm font-medium text-inkSoft min-[920px]:inline">
              <span className="text-lacquer">fuzhou</span>nese.org
            </span>
          </span>
        </NavLink>

        {/* 2. The links, with the two toggles at their far end. Wide: its
            natural width, right after the wordmark. Narrow: a second line of
            its own, the links scrolling sideways if they must.

            At medium widths this used to shrink below the width of the links
            while `md:overflow-visible` let them keep drawing, so "Contribute"
            and "About" ran underneath the toggles. Nothing here shrinks now;
            the search pill beside it is what gives way. */}
        <div className="order-3 flex min-w-0 basis-full items-center gap-x-3 pb-2 md:order-2 md:w-auto md:min-w-[auto] md:flex-1 md:basis-auto md:pb-0">
          <nav
            aria-label="Site"
            className="nav-strip -ml-2 flex min-w-0 flex-1 items-center justify-between overflow-x-auto whitespace-nowrap sm:gap-x-1 md:min-w-[auto] md:gap-x-2 md:overflow-visible"
          >
            <NavLink href="/browse" className={navLink}>{t("nav.browse")}</NavLink>
            <NavLink href="/learn" className={navLink}>{t("nav.learn")}</NavLink>
            <NavLink href="/contribute" also={["/submit", "/improve", "/request", "/admin"]} className={navLink}>{t("nav.contribute")}</NavLink>
            <NavLink href="/about" className={navLink}>{t("nav.about")}</NavLink>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LangToggle lang={lang} />
            <ThemeToggle icon label={t("theme.dark")} />
          </div>
        </div>

        {/* 3. Search pill and the account, at the end of the top row. This
            group holds its preferred width and only gives way when the row
            runs out — the links beside it take the slack first, and the pill
            never goes below a width that shows a word of the placeholder. */}
        <div className="order-2 ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 md:order-3 md:flex-initial">
          <HeaderSearch className="min-w-0 flex-1 basis-[120px] sm:w-[248px] sm:flex-none md:flex-initial md:min-w-[104px]" placeholder={t("search.header")} label={t("search.label")} />
          {user ? (
            <NavLink
              href="/account"
              plain
              aria-label={t("nav.account")}
              title={profile?.display_name || t("nav.account")}
              className="inline-flex shrink-0 rounded-full"
            >
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name}
                size={32}
                className="ring-1 ring-ruleStrong transition hover:ring-ink"
              />
            </NavLink>
          ) : (
            <SignInButton
              className="btn btn-primary shrink-0 !min-h-[32px] !px-3.5 !text-[13px] [&>svg]:hidden"
              label={t("nav.signin")}
            />
          )}
        </div>
      </div>
    </header>
  );
}

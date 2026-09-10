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

   Wide:   wordmark · Browse Learn Contribute About … EN/中文 · ☾ · search · Sign in
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
  const navLink = "rounded-lg px-1.5 py-2 text-[13px] font-medium leading-none transition-colors md:px-2.5 md:text-sm";

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
            <span className="han text-[17px] font-bold leading-none">福州話</span>
            <span className="hidden text-sm font-medium text-inkSoft md:inline">fuzhounese.org</span>
          </span>
        </NavLink>

        {/* 2. The links, with the two toggles at their far end. Wide: in the
            row after the wordmark, growing to push the toggles right. Narrow:
            a second line of their own. */}
        <div className="order-3 flex min-w-0 basis-full items-center gap-x-3 pb-2 md:order-2 md:min-w-0 md:flex-1 md:basis-auto md:pb-0">
          <nav
            aria-label="Site"
            className="nav-strip -ml-2 flex min-w-0 flex-1 items-center gap-x-1 overflow-x-auto whitespace-nowrap md:overflow-visible"
          >
            <NavLink href="/browse" className={navLink}>{t("nav.browse")}</NavLink>
            <NavLink href="/learn" className={navLink}>{t("nav.learn")}</NavLink>
            <NavLink href="/contribute" also={["/submit", "/improve", "/request", "/admin"]} className={navLink}>{t("nav.contribute")}</NavLink>
            <NavLink href="/about" className={navLink}>{t("nav.about")}</NavLink>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <LangToggle lang={lang} />
            <ThemeToggle icon label={t("theme.dark")} />
          </div>
        </div>

        {/* 3. Search pill and the account, at the end of the top row. */}
        <div className="order-2 ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 md:order-3 md:flex-none">
          <HeaderSearch className="min-w-0 flex-1 basis-[120px] sm:w-[220px] sm:flex-none" placeholder={t("search.header")} label={t("search.label")} />
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

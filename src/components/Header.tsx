import { getSessionUser } from "@/lib/auth";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import NavLink from "./NavLink";
import SignInButton from "./SignInButton";
import Avatar from "./Avatar";
import HeaderSearch from "./HeaderSearch";
import LangToggle from "./LangToggle";
import ThemeToggle from "./ThemeToggle";
import NavStrip from "./NavStrip";
import { reviewCount } from "@/lib/review";
import { newApprovals, editorWelcome } from "@/lib/approvals";

/* The header, after the 9 Sep 2026 redesign: one 56px row, sticky, with a
   frosted background so the page shows through as it scrolls under it.

   Wide:   wordmark … search · Browse Learn Contribute About · EN/中文 · ☾ · Sign in
   Narrow: wordmark · search … Sign in
           Browse Learn Contribute About … EN/中文 · ☾

   The same elements at every width, reordered with flex `order`, so the two
   layouts cannot drift apart. */

type SessionShape = Awaited<ReturnType<typeof getSessionUser>>;

export default async function Header() {
  const session = await getSessionUser();
  // Editors see how much is waiting for review on the Contribute link.
  const waiting = session.profile?.is_editor ? await reviewCount().catch(() => 0) : 0;
  // Everyone signed in: how many of their contributions were approved since
  // they last looked, as a dot on their avatar.
  // Plus one for a new editor who has not seen the welcome yet.
  const [approved, welcome] = session.user
    ? await Promise.all([
        newApprovals(session.user.id).then((a) => a.total).catch(() => 0),
        editorWelcome(session.user.id).catch(() => false),
      ])
    : [0, false];
  const news = approved + (welcome ? 1 : 0);
  return <HeaderView {...session} waiting={waiting} news={news} />;
}

/* Presentational half, exported so the layout can be rendered with a chosen
   session state (signed out / member / editor) without a real sign-in. */
export function HeaderView({ user, profile, waiting = 0, news = 0 }: SessionShape & { waiting?: number; news?: number }) {
  const lang = getLang();
  const t = translator(lang);
  const navLink = "tap ui inline-flex items-center rounded-sm px-1 py-2 text-[13px] min-[400px]:px-1.5 font-medium leading-none transition-colors md:px-2 md:text-sm lg:px-2.5";

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper">
      <div className="wrap flex flex-wrap items-center gap-x-3 md:h-14 md:flex-nowrap md:gap-x-3 lg:gap-x-5">
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
            {/* The domain shows at every width (Noah, 21 Sep 2026); the search
                pill beside it is what gives way when room is short. */}
            {/* 16px, up from 14 (Noah, 21 Sep 2026); leading-none so the
                line box, and so the header's height, stays as it was. */}
            <span className="text-base font-medium leading-none text-ink">
              <span className="text-lacquer">fuzhou</span>nese.org
            </span>
          </span>
        </NavLink>

        {/* 2. The search pill. Wide: pushed right, just before the links
            (Noah, 21 Sep 2026); it keeps a set width and shrinks before
            anything else does. On a phone it fills the top line between the
            wordmark and the account. On the home page and Browse it stays
            invisible until their big box scrolls away (HeaderSearch). */}
        <HeaderSearch
          className="order-2 min-w-0 flex-1 basis-0 md:ml-auto md:w-[248px] md:min-w-[96px] md:flex-initial md:basis-auto"
          placeholder={t("search.header")}
          placeholderShort={t("search.header")}
          label={t("search.label")}
        />

        {/* 3. The links, with the two toggles at their far end. Wide: pushed
            to the right. Narrow: a second line of its own, the links
            scrolling sideways if they must. Nothing here shrinks; the search
            pill is what gives way. */}
        <div className="order-4 flex min-w-0 basis-full items-center gap-x-3 pb-2 md:order-3 md:ml-auto md:w-auto md:[form+&]:ml-0 md:min-w-0 md:flex-none md:basis-auto md:pb-0">
          <NavStrip
            className="nav-strip -ml-1 -my-2 flex min-w-0 flex-1 items-center gap-x-0.5 overflow-x-auto py-2 pr-2 md:my-0 md:py-0 md:pr-0 min-[400px]:-ml-1.5 min-[400px]:gap-x-1 whitespace-nowrap md:-ml-2.5 md:flex-none md:overflow-visible"
          >
            <NavLink href="/browse" className={navLink}>{t("nav.browse")}</NavLink>
            <NavLink href="/learn" className={navLink}>{t("nav.learn")}</NavLink>
            <NavLink href="/about" className={navLink}>{t("nav.about")}</NavLink>
            <NavLink href="/contribute" also={["/add", "/improve", "/request", "/editor"]} className={`${navLink} relative${waiting > 0 ? " md:pr-4" : ""}`}>
              {t("nav.contribute")}
              {/* Editors only: everything waiting for review, at a glance. */}
              {waiting > 0 && (
                <span
                  className="relative z-10 ml-0.5 inline-block min-w-[18px] -translate-y-1.5 rounded-full bg-lacquer px-1 text-center text-[10px] font-bold leading-[18px] tabular-nums text-white ring-2 ring-paper md:absolute md:-right-1.5 md:-top-1.5 md:ml-0 md:translate-y-0"
                  aria-label={`${waiting} waiting for review`}
                >
                  {waiting > 99 ? "99+" : waiting}
                </span>
              )}
            </NavLink>
          </NavStrip>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Phone: the theme button, then EN|中文 at the right edge, level
                with Sign in above. Wide: the language first, as before. */}
            <LangToggle lang={lang} className="order-2 md:order-1" />
            <ThemeToggle icon label={t("theme.dark")} className="order-1 md:order-2" />
          </div>
        </div>

        {/* 4. The account, at the end of the top row. ml-auto keeps it at the
            right on a phone when there is no search pill to push it there. */}
        <div className="order-3 ml-auto flex shrink-0 items-center md:order-4 md:ml-0">
          {user ? (
            <NavLink
              href="/account"
              plain
              aria-label={t("nav.account")}
              title={profile?.display_name || t("nav.account")}
              className="relative inline-flex shrink-0 rounded-full"
            >
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name}
                size={32}
                className="ring-1 ring-ruleStrong transition hover:ring-ink"
              />
              {/* Something of theirs was approved: a dot, cleared from the
                  banner on the account page. */}
              {news > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-lacquer ring-2 ring-paper"
                  aria-label="New on your account page"
                />
              )}
            </NavLink>
          ) : (
            <SignInButton
              className="tap btn btn-primary shrink-0 !min-h-[32px] !px-3.5 !text-[13px] [&>svg]:hidden"
              label={t("nav.signin")}
            />
          )}
        </div>
      </div>
    </header>
  );
}

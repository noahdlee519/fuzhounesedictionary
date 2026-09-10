"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* A nav link that knows whether it is the page you are on.

   Two jobs:
   1. Set itself in ink and semibold when it is the current page (grey
      otherwise), and set aria-current so it is not only a colour cue.
   2. When you click the link for the page you are ALREADY on, Next does not
      re-render — same route, nothing to do — so PageFade would never replay.
      This fires an event for that case only. A click that really does change
      the route needs no event: the pathname change is the signal, and firing
      both would fade twice.
   --------------------------------------------------------------------------- */

export const FADE_EVENT = "fz:refade";

export function isCurrent(pathname: string, href: string) {
  // "/" would otherwise match everything.
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavLink({
  href,
  children,
  className,
  plain = false,
  announce = true,
  also,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Keep the element's own colours — used for the Add-a-word button and the
   *  avatar, which say "you are here" by other means. */
  plain?: boolean;
  /** The wordmark also points at "/", so on the home page it would be the
   *  second element claiming aria-current and a screen reader would say
   *  "current page" twice. It still fades on click; it just does not announce. */
  announce?: boolean;
  /** Other routes that count as this link's page — Contribute is "here" on
   *  /submit, /improve, /request and /admin as well as on /contribute. */
  also?: string[];
} & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  const pathname = usePathname();
  const current = isCurrent(pathname, href) || (also ?? []).some((h) => isCurrent(pathname, h));

  const colour = plain
    ? ""
    : current
      ? " text-ink font-semibold"
      : " text-inkSoft hover:text-ink";

  return (
    <Link
      href={href}
      aria-current={current && announce ? "page" : undefined}
      onClick={current ? () => window.dispatchEvent(new Event(FADE_EVENT)) : undefined}
      className={`${className ?? ""}${colour}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

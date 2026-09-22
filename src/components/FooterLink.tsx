"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCurrent } from "./NavLink";

/* A footer link, in bold on the page it points to (and, for Contribute, on
   the pages under it). Only the weight changes: the footer keeps its own
   colours, and the header's link is the one that carries aria-current. */
export default function FooterLink({
  href,
  also,
  className = "",
  children,
}: {
  href: string;
  also?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const here = isCurrent(pathname, href) || (also ?? []).some((h) => isCurrent(pathname, h));
  return (
    <Link href={href} className={`${className}${here ? " font-semibold text-ink" : ""}`}>
      {children}
    </Link>
  );
}

"use client";

import { usePathname } from "next/navigation";

// Re-keys on pathname so the wrapper remounts on each navigation,
// replaying the fade-and-rise defined by .page-fade in globals.css.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-fade">
      {children}
    </div>
  );
}

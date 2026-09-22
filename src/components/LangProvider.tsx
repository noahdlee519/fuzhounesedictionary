"use client";

import { createContext, useContext } from "react";
import type { Lang } from "@/lib/i18n";
import { pick } from "@/lib/i18n";

/* The page's language, for client components. The root layout reads the
   cookie on the server and hands it down here, so a client component renders
   the same language on the server and in the browser (no hydration flash). */
const LangContext = createContext<Lang>("en");

export default function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** `const L = useL(); L("Save", "儲存")` — the string for the page's language. */
export function useL() {
  return pick(useContext(LangContext));
}

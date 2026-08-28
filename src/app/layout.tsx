import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Newsreader, IBM_Plex_Mono } from "next/font/google";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { LICENSE } from "@/lib/constants";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap", adjustFontFallback: false });
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap", adjustFontFallback: false });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap", adjustFontFallback: false });

export const metadata: Metadata = {
  title: "Fuzhounese Dictionary",
  description:
    "A community dictionary of Fuzhounese (福州話 · Fuzhou · Eastern Min) — search words, hear pronunciations, and contribute your own.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <Header />
        <main className="mx-auto max-w-4xl px-5 py-10">
          <PageTransition>{children}</PageTransition>
        </main>
        <footer className="mx-auto max-w-4xl px-5 pb-14 pt-8">
          <div className="border-t border-rule pt-6 text-xs text-inkFaint">
            A community project to document Fuzhounese (福州話 · Fuzhou · Eastern Min).
            Contributions are reviewed before they appear. Dictionary content is licensed{" "}
            <a href={LICENSE.url} className="underline hover:text-lacquer" target="_blank" rel="noreferrer">
              {LICENSE.name}
            </a>
            .{" · "}
            <Link href="/admin" className="hover:text-lacquer">Editors</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}

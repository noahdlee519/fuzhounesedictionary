import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import { LICENSE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Fuzhounese Dictionary",
  description:
    "A community dictionary of Fuzhounese (福州話 · Foochow · Eastern Min) — search words, hear pronunciations, and contribute your own.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 py-10 text-center text-xs text-stone-400">
          A community project to document Fuzhounese (福州話 · Foochow · Eastern Min).
          <br />
          Contributions are reviewed before they appear. Dictionary content is licensed{" "}
          <a href={LICENSE.url} className="underline hover:text-accent" target="_blank" rel="noreferrer">
            {LICENSE.name}
          </a>
          .{" · "}
          <Link href="/admin" className="hover:text-accent">Editors</Link>
        </footer>
      </body>
    </html>
  );
}

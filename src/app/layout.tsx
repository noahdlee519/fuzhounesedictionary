import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Chivo, Newsreader, IBM_Plex_Mono } from "next/font/google";
import Header from "@/components/Header";
import { Analytics } from "@vercel/analytics/next";
import { LICENSE } from "@/lib/constants";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const display = Chivo({ subsets: ["latin"], variable: "--font-display", display: "swap", adjustFontFallback: false });
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap", adjustFontFallback: false });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap", adjustFontFallback: false });


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · 福州話`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Fuzhounese", "Foochow", "福州話", "Eastern Min", "Min Dong",
    "Fuzhou dialect", "Bàng-uâ-cê", "Chinese dialect dictionary",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} · 福州話`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${SITE_NAME} · 福州話` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · 福州話`,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <div aria-hidden className="site-margin site-margin-left" />
        <div aria-hidden className="site-margin site-margin-right" />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-lacquer focus:bg-paper focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="relative z-10 mx-auto max-w-4xl px-5 py-10">
          {children}
        </main>
        <footer className="relative z-10 mx-auto max-w-4xl px-5 pb-14 pt-8">
          <div className="border-t border-rule pt-6 text-xs text-inkFaint">
            A collaborative project to document, preserve, and teach Fuzhounese online.
            Contributions are reviewed before they appear. Dictionary content is licensed{" "}
            <a href={LICENSE.url} className="underline hover:text-lacquer" target="_blank" rel="noreferrer">
              {LICENSE.name}
            </a>
            .{" · "}
            <Link href="/admin" className="hover:text-lacquer">Editors</Link>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}

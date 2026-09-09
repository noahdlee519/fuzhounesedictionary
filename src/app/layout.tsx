import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Schibsted_Grotesk, Petrona, IBM_Plex_Mono } from "next/font/google";
import Header from "@/components/Header";
import PageFade from "@/components/PageFade";
import { Analytics } from "@vercel/analytics/next";
import { LICENSE } from "@/lib/constants";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// Faces chosen 8 Sep 2026 from a rendered four-way comparison (Chivo + Newsreader
// → Schibsted Grotesk + Petrona): same roles, less-travelled faces.
const display = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap", adjustFontFallback: false });
const serif = Petrona({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap", adjustFontFallback: false });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap", adjustFontFallback: false });


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Fuzhounese", "Fuzhou", "福州話", "Eastern Min", "Min Dong",
    "Fuzhou dialect", "Bàng-uâ-cê", "Chinese dialect dictionary",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  /* Icons declared here rather than by the app/ file convention, so the tags
     are exactly what Google's favicon crawler wants: a square PNG whose size
     is a multiple of 48, declared with its real size, at a stable URL with no
     cache-busting query string. The file convention declared favicon.ico as
     16x16 and hashed the PNG's URL, and Google never picked it up. The files
     live in public/. */
  icons: {
    icon: [
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

/* Tells Google the site's name for search results. Without it, the name is
   inferred from titles and og:site_name and can lag behind a change. */
const siteJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: ["Fuzhounese Dictionary", "福州話字典"],
  url: SITE_URL,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Stamp the theme before first paint so a chosen dark or light mode
            never flashes the other. Stored choice first, system preference
            otherwise. Tiny and synchronous on purpose. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
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
        <PageFade>
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
            <Link href="/privacy" className="hover:text-lacquer">Privacy</Link>
            {" · "}
            <Link href="/terms" className="hover:text-lacquer">Terms</Link>
            {" · "}
            <Link href="/admin" className="hover:text-lacquer">Editors</Link>
          </div>
        </footer>
        </PageFade>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd }} />
        <Analytics />
      </body>
    </html>
  );
}

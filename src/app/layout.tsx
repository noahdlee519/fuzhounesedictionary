import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import Header from "@/components/Header";
import NavMemory from "@/components/NavMemory";
import PageFade from "@/components/PageFade";
import { Analytics } from "@vercel/analytics/next";
import { LICENSE } from "@/lib/constants";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

// One Latin face for everything: Charis SIL, which SIL International makes for
// dictionaries and grammars of exactly this kind of language. It is here for
// its coverage as much as its look — it draws the combining marks of
// Bàng-uâ-cê (ṳ̆, nè̤ng, ā̤) and the whole IPA including the tone letters ˥ ˩,
// none of which the faces before it had. Self-hosted from src/fonts; see the
// README there. Romanization is never set in italic — the stacked marks sit
// correctly upright and drift in the italic. Noto Serif TC for Chinese
// characters is linked from Google Fonts in <head> because its 100-odd
// unicode-range slices are better fetched on demand than bundled.
const display = localFont({
  src: [
    { path: "../fonts/CharisSIL-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/CharisSIL-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/CharisSIL-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: false,
});

// And a second face for the interface only — the nav, buttons, chips, form
// fields and paging controls. Libre Franklin, a Franklin Gothic revival: the
// gothic that sits beside a Charter-family serif in newspapers and reference
// books, and characterful enough not to read as a default. It never touches
// dictionary content, so it needs no IPA or combining marks; the labels stay
// Charis small capitals.
const ui = localFont({
  src: [{ path: "../fonts/LibreFranklin.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-ui",
  display: "swap",
  adjustFontFallback: false,
});


// Fifteen characters that Noto Serif TC does not have. Its Google subsets stop
// at U+FFFF, and Fuzhounese keeps words above it — 𣍐 mâ̤, 𡳞 lâng — so the
// browser was substituting per character and a Mac picked a sans, leaving one
// word set in two faces. These glyphs are Hanazono Mincho, a Ming face like
// Noto's, cut down to only what the dictionary uses: 4.8 KB. The unicode-range
// keeps it off every other character, so it is fetched only by a page that has
// one. Rebuilt by scripts/make-rare-han-font.py, which reads the character
// list out of the CSVs.
const rareHan = localFont({
  src: [{ path: "../fonts/RareHan.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-rare",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      // One literal string: next/font rejects anything it has to evaluate.
      value: "U+206BA, U+2114F, U+2179F, U+21CDE, U+22BFD, U+231AF, U+23350, U+23E47, U+24D81, U+26067, U+27F28, U+29A11, U+29A4D, U+2BAA6, U+2C08C",
    },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Fuzhounese", "Fuzhounese dictionary", "Fuzhou", "福州話", "福州話字典",
    "Eastern Min", "Min Dong", "Fuzhou dialect", "Foochow", "Hokchew",
    "Bàng-uâ-cê", "Fuzhounese pronunciation", "Chinese dialect dictionary",
  ],
  alternates: { canonical: "/" },
  /* The card that Slack, iMessage, WhatsApp and the rest draw from a link.
     public/og.png is redrawn by scripts/make-brand-images.py; the ?v= is
     what makes those services fetch it again rather than serve the picture
     they cached from the old design. Bump it whenever the image changes. */
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/og.png?v=7", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og.png?v=7"],
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
  const lang = getLang();
  const t = translator(lang);
  return (
    <html lang={lang === "zh" ? "zh-Hant" : "en"} className={`${display.variable} ${ui.variable} ${rareHan.variable}`} style={{ ["--font-han" as string]: "'Noto Serif TC'" }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;700&display=swap"
        />
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
      <body className="flex min-h-screen flex-col antialiased">
        <NavMemory />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:border focus:border-lacquer focus:bg-paper focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        {/* The lattice from the first design, kept as a faint texture in the
            margins beyond the content column on wide screens. */}
        <div aria-hidden className="site-margin site-margin-left" />
        <div aria-hidden className="site-margin site-margin-right" />
        <Header />
        <PageFade>
        <main id="main" className="wrap relative z-10 w-full flex-1 py-10">
          {children}
        </main>
        <hr className="rule-bleed relative z-10" />
        <footer className="wrap relative z-10 w-full sec-sm">
          {/* Wordmark on its own line, then the four links in a row that
              wraps cleanly on a phone; the small print underneath in two
              lines rather than one run-on. */}
          <Link href="/" className="inline-flex items-baseline gap-2 whitespace-nowrap font-bold tracking-tight">
            <span className="han text-[17px] leading-none">
              <span className="text-lacquer">福州</span>話
            </span>
            <span className="text-sm font-medium text-ink">
              <span className="text-lacquer">fuzhou</span>nese.org
            </span>
          </Link>
          <nav aria-label="Footer" className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
            <Link href="/browse" className="linkq">{t("nav.browse")}</Link>
            <Link href="/learn" className="linkq">{t("nav.learn")}</Link>
            <Link href="/contribute" className="linkq">{t("nav.contribute")}</Link>
            <Link href="/about" className="linkq">{t("nav.about")}</Link>
          </nav>
          <p className="footnote mt-6 max-w-[60ch]">{t("footer.blurb")}</p>
          <p className="footnote mt-1.5">
            {t("footer.license")}{" "}
            <a href={LICENSE.url} className="whitespace-nowrap underline hover:text-ink" target="_blank" rel="noreferrer">
              {LICENSE.name}
            </a>
            <span className="mx-2">·</span>
            {/* Privacy and Terms exist only in English; the Chinese footer says so. */}
            <Link href="/privacy" className="hover:text-ink">{t("footer.privacy")}{lang === "zh" ? " (en)" : ""}</Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="hover:text-ink">{t("footer.terms")}{lang === "zh" ? " (en)" : ""}</Link>
            <span className="mx-2">·</span>
            <Link href="/admin" className="hover:text-ink">{t("footer.editors")}</Link>
          </p>
        </footer>
        </PageFade>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd }} />
        <Analytics />
      </body>
    </html>
  );
}

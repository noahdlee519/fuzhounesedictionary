import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* Every page here is built fresh on each visit, so each crawl costs server
   time (Vercel's free allowance ran out on 24 Sep 2026). Search engines and
   the AI assistants people actually ask about Fuzhounese stay welcome; the
   scrapers that crawl hard and send nobody back are turned away. Some of
   them ignore robots.txt (Bytespider notably), so Vercel's Firewall "AI
   bots" rule is the backstop. */
const TURNED_AWAY = [
  // Bulk AI-training and data scrapers.
  "Bytespider",
  "CCBot",
  "meta-externalagent",
  "Diffbot",
  "Omgilibot",
  "ImagesiftBot",
  // SEO-tool crawlers: heavy, and of no use to a dictionary.
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "BLEXBot",
  "Barkrowler",
  "serpstatbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: TURNED_AWAY, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/editor", "/editor/", "/account", "/auth/", "/improve"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

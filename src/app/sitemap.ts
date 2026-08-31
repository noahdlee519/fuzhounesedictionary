import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

// Public data only, so a plain anon client (no cookies) is all this needs.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stat = ["", "/learn", "/about", "/request", "/submit"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === "" ? "daily" : "weekly") as "daily" | "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return stat;

  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from("entries")
      .select("id, created_at, reviewed_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10000);

    const entries = (data ?? []).map((e: any) => ({
      url: `${SITE_URL}/entry/${e.id}`,
      lastModified: new Date(e.reviewed_at ?? e.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    return [...stat, ...entries];
  } catch {
    // A sitemap is never worth a 500.
    return stat;
  }
}

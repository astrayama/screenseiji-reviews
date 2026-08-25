import type { MetadataRoute } from "next";
import { getVisibleReviewCards, getLists } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const [cards, lists] = await Promise.all([getVisibleReviewCards(), getLists()]);

  const urls = new Map<string, string | null>();
  urls.set("/", null);
  urls.set("/archive", null);
  urls.set("/moods", null);
  urls.set("/lists", null);
  urls.set("/about", null);
  for (const c of cards) {
    urls.set(c.href.split("#")[0], c.date);
    if (c.rootTitle.franchise_id && c.rootTitle.franchise) {
      urls.set(`/franchises/${c.rootTitle.franchise.slug}`, c.date);
    }
    if (c.rootTitle.kind === "series") urls.set(`/series/${c.rootTitle.slug}`, c.date);
  }
  for (const l of lists) urls.set(`/lists/${l.slug}`, null);

  return [...urls.entries()].map(([path, date]) => ({
    url: base + path,
    ...(date ? { lastModified: new Date(date) } : {}),
  }));
}

import type { MetadataRoute } from "next";

// Read SITE_URL per request — a static robots.txt would bake in whatever
// address the build machine had (localhost), not the live site's.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/desk", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}

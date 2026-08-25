import { getVisibleReviewCards } from "@/lib/queries";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const cards = (await getVisibleReviewCards()).slice(0, 30);
  const items = cards
    .map((c) => {
      const scoreBit = c.score !== null ? ` — ${c.score.toFixed(1)}/10` : "";
      return `  <item>
    <title>${esc(c.displayName)}${esc(scoreBit)}</title>
    <link>${base}${esc(c.href)}</link>
    <guid isPermaLink="false">${c.review.id}</guid>
    ${c.date ? `<pubDate>${new Date(c.date).toUTCString()}</pubDate>` : ""}
    ${c.verdict ? `<description>${esc(c.verdict)}</description>` : ""}
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Screen Sage</title>
  <link>${base}</link>
  <description>Film and series reviews from a single voice.</description>
${items}
</channel>
</rss>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}

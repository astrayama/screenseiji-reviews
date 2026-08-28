import { getVisibleReviewCards, getSiteConfig } from "@/lib/queries";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cdata(s: string): string {
  // "]]>" inside content would close the CDATA section early
  return `<![CDATA[${s.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

export async function GET() {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const [cards, cfg] = await Promise.all([getVisibleReviewCards(), getSiteConfig()]);
  const recent = cards.slice(0, 30);
  const lastBuild = recent[0]?.date ? new Date(recent[0].date).toUTCString() : new Date().toUTCString();
  const description = cfg.tagline || "Film and series reviews from a single voice. No algorithms, one sage.";

  const items = recent
    .map((c) => {
      // "— 🤩 9.2/10", "— 🤩", "— 9.2/10", or nothing
      const bits = [c.emoji, c.score !== null ? `${c.score.toFixed(1)}/10` : null].filter(Boolean);
      const scoreBit = bits.length ? ` — ${bits.join(" ")}` : "";
      const link = `${base}${c.href.split("#")[0]}`;
      const categories = c.tags
        .map((t) => `    <category>${esc(t.name)}</category>`)
        .join("\n");
      // full spoiler-free review in the feed; the spoiler zone never leaves the site
      const bodyParts: string[] = [];
      if (c.emoji || c.score !== null) {
        const verdictBits = [
          c.emoji,
          c.score !== null ? `${c.score.toFixed(1)} / 10` : null,
        ].filter(Boolean);
        bodyParts.push(`<p><strong>The verdict: ${esc(verdictBits.join(" "))}</strong></p>`);
      }
      if (c.verdict) bodyParts.push(`<p><em>${esc(c.verdict)}</em></p>`);
      if (c.review.body_spoiler_free) bodyParts.push(renderMarkdown(c.review.body_spoiler_free));
      if (c.review.body_spoilers) {
        bodyParts.push(`<p><em>There is also a spoiler zone — it only unveils on the site.</em></p>`);
      }
      bodyParts.push(`<p><a href="${link}">Read on Screen Sage →</a></p>`);
      return `  <item>
    <title>${esc(c.displayName)}${esc(scoreBit)}</title>
    <link>${link}</link>
    <guid isPermaLink="false">${c.review.id}</guid>
${c.date ? `    <pubDate>${new Date(c.date).toUTCString()}</pubDate>\n` : ""}${c.verdict ? `    <description>${esc(c.verdict)}</description>\n` : ""}${categories ? categories + "\n" : ""}    <content:encoded>${cdata(bodyParts.join("\n"))}</content:encoded>
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Screen Sage</title>
  <link>${base}</link>
  <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${esc(description)}</description>
  <language>en</language>
  <lastBuildDate>${lastBuild}</lastBuildDate>
  <ttl>60</ttl>
${items}
</channel>
</rss>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

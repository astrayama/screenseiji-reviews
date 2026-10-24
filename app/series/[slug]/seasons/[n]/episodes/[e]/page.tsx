import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEpisodePage, episodeHref, episodeTitle, seasonHref } from "@/lib/queries";
import { renderMarkdown } from "@/lib/markdown";
import { fmtDate } from "@/lib/util";
import { TagRows } from "@/components/TagRows";
import { PosterImg } from "@/components/PosterImg";
import { Score } from "@/components/Score";
import { SubScoreBars } from "@/components/SubScoreBars";
import { SpoilerZone } from "@/components/SpoilerZone";
import { NewsletterBar } from "@/components/NewsletterBar";
import { MiniScore } from "@/components/MiniScore";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; n: string; e: string }> };

function parse(n: string, e: string) {
  const season = Number(n);
  const episode = Number(e);
  return Number.isInteger(season) && Number.isInteger(episode) && season > 0 && episode > 0
    ? { season, episode }
    : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n, e } = await params;
  const nums = parse(n, e);
  if (!nums) return { title: "Not found" };
  const data = await getEpisodePage(slug, nums.season, nums.episode);
  if (!data) return { title: "Not found" };
  const name = episodeTitle(data.episode.name, data.episode.number);
  return {
    title: `${data.series.title.name} S${nums.season}E${nums.episode} — ${name}`,
    description: data.card.review.verdict ?? undefined,
  };
}

export default async function EpisodePage({ params }: Props) {
  const { slug, n, e } = await params;
  const nums = parse(n, e);
  if (!nums) notFound();
  const data = await getEpisodePage(slug, nums.season, nums.episode);
  if (!data) notFound();

  const { series, season, episode, card, subScores, isPeak, prev, next } = data;
  const review = card.review;
  const title = series.title;
  const name = episodeTitle(episode.name, episode.number);
  const label = `S${season.number}E${episode.number}`;
  const bodyHtml = renderMarkdown(review.body_spoiler_free);
  const spoilerHtml = review.body_spoilers ? renderMarkdown(review.body_spoilers) : null;
  const base = process.env.SITE_URL ?? "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "TVEpisode",
      name,
      episodeNumber: episode.number,
      partOfSeason: { "@type": "TVSeason", seasonNumber: season.number },
      partOfSeries: { "@type": "TVSeries", name: title.name },
    },
    author: { "@type": "Person", name: "The Sage" },
    ...(card.score !== null
      ? { reviewRating: { "@type": "Rating", ratingValue: card.score, bestRating: 10, worstRating: 0 } }
      : {}),
    ...(review.verdict ? { reviewBody: review.verdict } : {}),
    ...(review.published_at ? { datePublished: review.published_at } : {}),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Series", item: `${base}/archive?type=series` },
      { "@type": "ListItem", position: 2, name: title.name, item: `${base}/series/${title.slug}` },
      {
        "@type": "ListItem",
        position: 3,
        name: `Season ${season.number}`,
        item: `${base}${seasonHref(title.slug, season.number)}`,
      },
      { "@type": "ListItem", position: 4, name },
    ],
  };

  return (
    <article className="wrap col" style={{ gap: 22, maxWidth: 780 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {(card.score !== null || card.emoji) && (
        <MiniScore score={card.score} emoji={card.emoji} name={label} />
      )}

      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/archive?type=series">Series</Link> →{" "}
        <Link href={`/series/${title.slug}`}>{title.name}</Link> →{" "}
        <Link href={seasonHref(title.slug, season.number)}>Season {season.number}</Link> → {label}
      </nav>

      <header className="row" style={{ gap: 18, alignItems: "flex-start" }}>
        <div style={{ width: 92, flex: "none" }}>
          <PosterImg src={season.poster_url ?? title.poster_url} alt={title.name} />
        </div>
        <div className="col" style={{ gap: 9, flex: 1 }}>
          <Link href={`/series/${title.slug}`} className="mono-note" style={{ fontSize: 12 }}>
            {title.name} · Season {season.number}
          </Link>
          <h1 className="ttl" style={{ fontSize: "clamp(26px, 4vw, 38px)" }}>
            <span style={{ fontSize: "0.5em" }}>{label}</span> {name}
          </h1>
          <TagRows tags={series.tags} />
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {isPeak && (
              <span className="chip chip--tag" style={{ ["--c" as string]: "var(--amber)" }}>
                season peak
              </span>
            )}
            {review.published_at && <span className="chip">{fmtDate(review.published_at)}</span>}
          </div>
        </div>
      </header>

      <section
        id="verdict-box"
        className="gl gl--amber row between"
        style={{
          padding: 20,
          gap: 20,
          background: "linear-gradient(115deg, rgba(255,217,168,.08), rgba(255,184,217,.06))",
        }}
      >
        <div className="col" style={{ gap: 6, flex: 1 }}>
          <span className="label label--amber">The verdict</span>
          {review.verdict && (
            <p style={{ margin: 0, color: "var(--bright)", fontSize: 16.5, lineHeight: 1.5 }}>
              {review.verdict}
            </p>
          )}
        </div>
        {(card.score !== null || card.emoji) && (
          <div className="col" style={{ alignItems: "center", gap: 2, flex: "none" }}>
            <Score score={card.score} emoji={card.emoji} variant="verdict" countUp />
          </div>
        )}
      </section>

      <Reveal>
        <SubScoreBars subScores={subScores} />
      </Reveal>

      {/* a pull quote can stand on its own — it used to be hidden whenever
          there was no spoiler-free body to wrap it */}
      {(bodyHtml || review.pull_quote) && (
        <section className="col" style={{ gap: 8 }}>
          {bodyHtml && <span className="label">Spoiler-free</span>}
          {bodyHtml && <div className="prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
          {review.pull_quote && <div className="pull-quote">{review.pull_quote}</div>}
        </section>
      )}

      {spoilerHtml && <SpoilerZone html={spoilerHtml} />}

      {/* nearest reviewed episodes on either side */}
      {(prev || next) && (
        <nav className="row between" style={{ gap: 12, marginTop: 6 }} aria-label="Episodes">
          {prev ? (
            <Link
              className="chip"
              href={episodeHref(title.slug, season.number, prev.number)}
              style={{ maxWidth: "48%" }}
            >
              ‹ E{prev.number} {prev.name}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              className="chip"
              href={episodeHref(title.slug, season.number, next.number)}
              style={{ maxWidth: "48%" }}
            >
              E{next.number} {next.name} ›
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <Link className="mono-note" href={seasonHref(title.slug, season.number)}>
        ← all of Season {season.number}
      </Link>

      <Reveal>
        <NewsletterBar />
      </Reveal>
    </article>
  );
}

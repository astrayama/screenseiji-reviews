import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFilmPage } from "@/lib/queries";
import { renderMarkdown } from "@/lib/markdown";
import { fmtRuntime, fmtDate } from "@/lib/util";
import { TagRows } from "@/components/TagRows";
import { PosterImg } from "@/components/PosterImg";
import { Score } from "@/components/Score";
import { normalizeEmoji } from "@/lib/emoji";
import { SubScoreBars } from "@/components/SubScoreBars";
import { SpoilerZone } from "@/components/SpoilerZone";
import { NewsletterBar } from "@/components/NewsletterBar";
import { MiniScore } from "@/components/MiniScore";
import { Reveal } from "@/components/Reveal";
import { LikeButton } from "@/components/LikeButton";
import { getLikeState, voterFromHeaders } from "@/lib/likes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getFilmPage(slug);
  if (!data || !data.review) return { title: "Not found" };
  const year = data.title.year ? ` (${data.title.year})` : "";
  return {
    title: `${data.title.name}${year} — review`,
    description: data.review.verdict ?? undefined,
  };
}

export default async function FilmPage({ params }: Props) {
  const { slug } = await params;
  const data = await getFilmPage(slug);
  if (!data || !data.review) notFound();
  const { title, review, tags, subScores, siblings } = data;
  const score = review.score === null ? null : Number(review.score);
  const emoji = normalizeEmoji(review.emoji);
  const spoilerFreeHtml = renderMarkdown(review.body_spoiler_free);
  const spoilerHtml = review.body_spoilers ? renderMarkdown(review.body_spoilers) : null;
  const runtime = fmtRuntime(title.runtime_minutes);
  const franchise = title.franchise ?? null;
  const otherMembers = siblings.filter((s) => s.id !== title.id);
  const likes = await getLikeState(review.id, voterFromHeaders(await headers()));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: { "@type": "Movie", name: title.name, ...(title.year ? { dateCreated: String(title.year) } : {}) },
    author: { "@type": "Person", name: "The Sage" },
    ...(score !== null
      ? { reviewRating: { "@type": "Rating", ratingValue: score, bestRating: 10, worstRating: 0 } }
      : {}),
    ...(review.verdict ? { reviewBody: review.verdict } : {}),
    ...(review.published_at ? { datePublished: review.published_at } : {}),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Films", item: "/archive?type=film" },
      ...(franchise
        ? [{ "@type": "ListItem", position: 2, name: franchise.name, item: `/franchises/${franchise.slug}` }]
        : []),
      { "@type": "ListItem", position: franchise ? 3 : 2, name: title.name },
    ],
  };

  return (
    <article className="wrap col" style={{ gap: 36 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {(score !== null || emoji) && <MiniScore score={score} emoji={emoji} name={title.name} />}

      <div className="col" style={{ gap: 28 }}>
        <nav className="crumb" aria-label="Breadcrumb">
          <Link href="/archive?type=film">Films</Link>
          {franchise && (
            <>
              {" › "}
              <Link href={`/franchises/${franchise.slug}`}>{franchise.name}</Link>
            </>
          )}
          {" › "}
          {title.name}
        </nav>

        <header className="page-head">
          <div className="poster-col">
            <PosterImg src={title.poster_url} alt={title.name} />
          </div>
          <div className="col" style={{ gap: 14, flex: 1, minWidth: 0 }}>
            <span className="label">Film review</span>
            <h1 className="ttl" style={{ fontSize: "clamp(34px, 5vw, 52px)" }}>
              {title.name}{" "}
              {title.year && (
                <span style={{ fontSize: "0.5em", color: "var(--muted)", fontWeight: 700 }}>({title.year})</span>
              )}
            </h1>
            {(runtime || review.published_at) && (
              <div className="meta-line">
                {runtime && <span>{runtime}</span>}
                {review.published_at && <span>{fmtDate(review.published_at)}</span>}
              </div>
            )}
            {/* tags first, right under the title */}
            <TagRows tags={tags} />
          </div>
        </header>
      </div>

      <hr className="hr" />

      <div className="review-grid">
        <div className="review-main col" style={{ gap: 36 }}>
          {/* the verdict */}
          <section id="verdict-box" className="verdict-card col" style={{ padding: "28px 30px", gap: 12 }}>
            <span className="label">The verdict</span>
            {review.verdict && <p className="verdict-text">{review.verdict}</p>}
          </section>

          {/* spoiler-free */}
          {/* a pull quote can stand on its own — it used to be hidden whenever
              there was no spoiler-free body to wrap it */}
          {(spoilerFreeHtml || review.pull_quote) && (
            <section className="col" style={{ gap: 14 }}>
              {spoilerFreeHtml && <span className="label">Spoiler-free</span>}
              {spoilerFreeHtml && <div className="prose" dangerouslySetInnerHTML={{ __html: spoilerFreeHtml }} />}
              {review.pull_quote && <div className="pull-quote">{review.pull_quote}</div>}
            </section>
          )}

          {spoilerHtml && <SpoilerZone html={spoilerHtml} />}

          <LikeButton reviewId={review.id} initialCount={likes.count} initialLiked={likes.liked} />

          {/* more from the franchise */}
          {franchise && otherMembers.length > 0 && (
            <Reveal>
              <section className="col" style={{ gap: 16 }}>
                <h2 className="sec-title" style={{ fontSize: 24 }}>More from {franchise.name}</h2>
                <div className="row" style={{ gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  {otherMembers.slice(0, 4).map((m) => (
                    <Link key={m.id} href={m.kind === "film" ? `/films/${m.slug}` : `/series/${m.slug}`} className="tiltable" style={{ width: 120 }}>
                      <PosterImg src={m.poster_url} alt={m.name} />
                    </Link>
                  ))}
                  <Link className="mono-note" href={`/franchises/${franchise.slug}`} style={{ alignSelf: "center" }}>
                    → franchise hub
                  </Link>
                </div>
              </section>
            </Reveal>
          )}
        </div>

        <aside className="review-side col" style={{ gap: 20 }}>
          {(score !== null || emoji) && (
            <section className="gl col" style={{ padding: "26px 24px", gap: 16, alignItems: "center", textAlign: "center" }}>
              <span className="label" style={{ alignSelf: "flex-start" }}>The score</span>
              <Score score={score} emoji={emoji} variant="verdict" countUp />
            </section>
          )}
          <Reveal>
            <SubScoreBars subScores={subScores} />
          </Reveal>
        </aside>
      </div>

      <Reveal>
        <NewsletterBar />
      </Reveal>
    </article>
  );
}

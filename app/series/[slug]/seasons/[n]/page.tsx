import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeasonPage, episodeHref } from "@/lib/queries";
import { renderMarkdown } from "@/lib/markdown";
import { TagRows } from "@/components/TagRows";
import { PosterImg } from "@/components/PosterImg";
import { EpisodeRows, EpisodeRowData } from "@/components/EpisodeRows";
import { SubScoreBars } from "@/components/SubScoreBars";
import { Score } from "@/components/Score";
import { SpoilerZone } from "@/components/SpoilerZone";
import { Reveal } from "@/components/Reveal";
import { LikeButton } from "@/components/LikeButton";
import { getLikeState, voterFromHeaders } from "@/lib/likes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n } = await params;
  const data = await getSeasonPage(slug, Number(n));
  if (!data) return { title: "Not found" };
  return {
    title: `${data.series.title.name} — Season ${n} review`,
    description: data.entry.seasonReview?.verdict ?? undefined,
  };
}

export default async function SeasonPage({ params }: Props) {
  const { slug, n } = await params;
  const num = Number(n);
  if (!Number.isInteger(num)) notFound();
  const data = await getSeasonPage(slug, num);
  if (!data) notFound();
  const { series, entry, episodes, subScores, peak } = data;
  const seasonReview = entry.seasonReview;
  // only a reviewed season has something to like
  const likes = seasonReview
    ? await getLikeState(seasonReview.review.id, voterFromHeaders(await headers()))
    : null;

  const rows: EpisodeRowData[] = episodes.map((e) => ({
    number: e.episode.number,
    name: e.episode.name,
    score: e.card?.score ?? null,
    emoji: e.card?.emoji ?? null,
    verdict: e.card?.review.verdict ?? null,
    // Only reviewed episodes have a page; the rest stay as plain rows.
    href: e.card ? episodeHref(series.title.slug, num, e.episode.number) : null,
    isPeak: peak !== null && e.card?.score === peak,
  }));

  const spoilerHtml = seasonReview?.review.body_spoilers
    ? renderMarkdown(seasonReview.review.body_spoilers)
    : null;

  return (
    <div className="wrap col" style={{ gap: 36 }}>
      <div className="col" style={{ gap: 28 }}>
        <nav className="crumb" aria-label="Breadcrumb">
          <Link href="/archive?type=series">Series</Link> ›{" "}
          <Link href={`/series/${series.title.slug}`}>{series.title.name}</Link> › Season {num}
        </nav>

        <header className="page-head">
          <div className="poster-col">
            {/* the season's own art where TMDB gave us one, else the series' */}
            <PosterImg
              src={entry.season.poster_url ?? series.title.poster_url}
              alt={`${series.title.name} season ${num}`}
            />
          </div>
          <div className="col" style={{ gap: 14, flex: 1, minWidth: 0 }}>
            <p className="label" style={{ margin: 0 }}>
              Season {num}
              {entry.season.name && entry.season.name !== `Season ${num}` && (
                <span style={{ color: "var(--muted)" }}> — {entry.season.name}</span>
              )}
            </p>
            <h1 className="ttl" style={{ fontSize: "clamp(34px, 5vw, 52px)" }}>
              <Link href={`/series/${series.title.slug}`}>{series.title.name}</Link>
            </h1>
            {(entry.season.episode_count || entry.season.year) && (
              <div className="meta-line">
                {entry.season.episode_count && <span>{entry.season.episode_count} eps</span>}
                {entry.season.year && <span>{entry.season.year}</span>}
              </div>
            )}
            <TagRows tags={series.tags} />
          </div>
        </header>
      </div>

      <hr className="hr" />

      <div className="review-grid">
        <div className="review-main col" style={{ gap: 36 }}>
          {rows.length ? (
            <EpisodeRows episodes={rows} />
          ) : (
            <p className="mono-note">no episodes on record for this season yet</p>
          )}

          {seasonReview && (
            <Reveal>
              <section className="verdict-card col" style={{ padding: "28px 30px", gap: 12 }}>
                <span className="label">Season verdict</span>
                {seasonReview.review.verdict && <p className="verdict-text">{seasonReview.review.verdict}</p>}
                {seasonReview.review.body_spoiler_free && (
                  <div
                    className="prose"
                    style={{ marginTop: 6 }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(seasonReview.review.body_spoiler_free) }}
                  />
                )}
              </section>
            </Reveal>
          )}

          {spoilerHtml && <SpoilerZone html={spoilerHtml} />}

          {seasonReview && likes && (
            <LikeButton reviewId={seasonReview.review.id} initialCount={likes.count} initialLiked={likes.liked} />
          )}
        </div>

        <aside className="review-side col" style={{ gap: 20 }}>
          <section className="gl col" style={{ padding: "26px 24px", gap: 16, alignItems: "center", textAlign: "center" }}>
            <span className="label" style={{ alignSelf: "flex-start" }}>Season score</span>
            <Score
              score={seasonReview?.score ?? null}
              emoji={seasonReview?.emoji ?? null}
              variant="verdict"
              empty="dash"
            />
          </section>
          <SubScoreBars subScores={subScores} />
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
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
    <div className="wrap col" style={{ gap: 22, maxWidth: 780 }}>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/archive?type=series">Series</Link> →{" "}
        <Link href={`/series/${series.title.slug}`}>{series.title.name}</Link> → Season {num}
      </nav>

      <header className="row" style={{ gap: 18, alignItems: "flex-start" }}>
        <div style={{ width: 110, flex: "none" }}>
          {/* the season's own art where TMDB gave us one, else the series' */}
          <PosterImg
            src={entry.season.poster_url ?? series.title.poster_url}
            alt={`${series.title.name} season ${num}`}
          />
        </div>
        <div className="col" style={{ gap: 8, flex: 1 }}>
          <div className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <h1 className="ttl" style={{ fontSize: "clamp(28px, 4.5vw, 40px)" }}>
                <Link href={`/series/${series.title.slug}`}>{series.title.name}</Link>
              </h1>
              <p
                style={{
                  margin: 0,
                  font: "600 15px var(--mono)",
                  letterSpacing: 1,
                  color: "var(--amber)",
                }}
              >
                Season {num}
                {entry.season.name && entry.season.name !== `Season ${num}` && (
                  <span style={{ color: "var(--muted)" }}> — {entry.season.name}</span>
                )}
              </p>
            </div>
            <Score
              score={seasonReview?.score ?? null}
              emoji={seasonReview?.emoji ?? null}
              variant="pill"
              empty="dash"
              style={{ fontSize: 15, flex: "none" }}
            />
          </div>
          <TagRows tags={series.tags} />
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {entry.season.episode_count && <span className="chip">{entry.season.episode_count} eps</span>}
            {entry.season.year && <span className="chip">{entry.season.year}</span>}
          </div>
        </div>
      </header>

      <hr className="hr" />

      {rows.length ? (
        <EpisodeRows episodes={rows} />
      ) : (
        <p className="mono-note">no episodes on record for this season yet</p>
      )}

      {seasonReview && (
        <Reveal>
          <section className="gl col" style={{ padding: 16, gap: 8 }}>
            <span className="label">Season verdict</span>
            {seasonReview.review.verdict && (
              <p style={{ margin: 0, color: "var(--bright)", fontSize: 16 }}>{seasonReview.review.verdict}</p>
            )}
            {seasonReview.review.body_spoiler_free && (
              <div
                className="prose"
                style={{ fontSize: 17.5 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(seasonReview.review.body_spoiler_free) }}
              />
            )}
          </section>
        </Reveal>
      )}

      <SubScoreBars subScores={subScores} />
      {spoilerHtml && <SpoilerZone html={spoilerHtml} />}
    </div>
  );
}

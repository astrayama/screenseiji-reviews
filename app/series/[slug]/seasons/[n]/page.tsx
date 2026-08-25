import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeasonPage } from "@/lib/queries";
import { renderMarkdown } from "@/lib/markdown";
import { TagChip } from "@/components/TagChip";
import { EpisodeRows, EpisodeRowData } from "@/components/EpisodeRows";
import { SubScoreBars } from "@/components/SubScoreBars";
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
    verdict: e.card?.review.verdict ?? null,
    bodyHtml: e.card?.review.body_spoiler_free
      ? renderMarkdown(e.card.review.body_spoiler_free)
      : null,
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

      <header className="row between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div className="col" style={{ gap: 8 }}>
          <h1 className="ttl" style={{ fontSize: "clamp(26px, 4vw, 36px)" }}>
            Season {num}
            {entry.season.name && entry.season.name !== `Season ${num}` && (
              <span style={{ fontSize: "0.6em" }}> — {entry.season.name}</span>
            )}
          </h1>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {series.tags.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
            {entry.season.episode_count && <span className="chip">{entry.season.episode_count} eps</span>}
          </div>
        </div>
        {seasonReview?.score != null ? (
          <span className="sc" style={{ fontSize: 15 }}>{seasonReview.score.toFixed(1)}</span>
        ) : (
          <span className="sc sc--empty">—</span>
        )}
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

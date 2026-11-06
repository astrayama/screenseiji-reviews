import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeriesPage, episodeHref, seasonHref } from "@/lib/queries";
import { TagRows } from "@/components/TagRows";
import { PosterImg } from "@/components/PosterImg";
import { SeasonAccordion } from "@/components/SeasonAccordion";
import { NewsletterBar } from "@/components/NewsletterBar";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSeriesPage(slug);
  if (!data) return { title: "Not found" };
  return {
    title: `${data.title.name} — series review`,
    description: data.title.synopsis ?? undefined,
  };
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const data = await getSeriesPage(slug);
  if (!data) notFound();
  const { title, tags, seasons, average } = data;

  const rows = seasons.map((s) => ({
    number: s.season.number,
    episodeCount: s.season.episode_count,
    score: s.seasonReview?.score ?? null,
    emoji: s.seasonReview?.emoji ?? null,
    reviewingNow: !s.seasonReview && s.episodeCards.length > 0,
    // every reviewed episode gets a chip, including ones with only a verdict
    episodeChips: s.episodeCards.map((c) => ({
      label: `E${c.episodeNumber}`,
      score: c.score,
      emoji: c.emoji,
      href: episodeHref(title.slug, s.season.number, c.episodeNumber ?? 0),
    })),
    href: seasonHref(title.slug, s.season.number),
  }));

  return (
    <div className="wrap col" style={{ gap: 36 }}>
      <div className="col" style={{ gap: 28 }}>
        <nav className="crumb" aria-label="Breadcrumb">
          <Link href="/archive?type=series">Series</Link> › {title.name}
        </nav>

        <header className="page-head">
          <div className="poster-col">
            <PosterImg src={title.poster_url} alt={title.name} />
          </div>
          <div className="col" style={{ gap: 14, flex: 1, minWidth: 0 }}>
            <span className="label">Series</span>
            <h1 className="ttl" style={{ fontSize: "clamp(34px, 5vw, 52px)" }}>{title.name}</h1>
            <div className="meta-line">
              <span>
                {seasons.length} season{seasons.length === 1 ? "" : "s"}
              </span>
              {title.status_text && <span>{title.status_text}</span>}
            </div>
            {title.synopsis && (
              <p style={{ margin: 0, color: "var(--text)", fontSize: 16, maxWidth: 640 }}>{title.synopsis}</p>
            )}
            <TagRows tags={tags} />
            {average !== null && (
              <div className="row">
                <span className="sc">{average.toFixed(1)}</span>
                <span className="mono-note">series avg</span>
              </div>
            )}
          </div>
        </header>
      </div>

      <hr className="hr" />

      {rows.length ? (
        <div style={{ maxWidth: 880 }}>
          <SeasonAccordion seasons={rows} />
        </div>
      ) : (
        <div className="empty">
          <p className="mono-note" style={{ margin: 0 }}>no seasons on record yet</p>
        </div>
      )}

      <Reveal>
        <NewsletterBar />
      </Reveal>
    </div>
  );
}

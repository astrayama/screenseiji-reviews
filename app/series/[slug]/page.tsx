import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeriesPage, episodeHref, seasonHref } from "@/lib/queries";
import { TagChip } from "@/components/TagChip";
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
    <div className="wrap col" style={{ gap: 24, maxWidth: 820 }}>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/archive?type=series">Series</Link> → {title.name}
      </nav>

      <header className="row" style={{ gap: 20, alignItems: "flex-start" }}>
        <div style={{ width: 120, flex: "none" }}>
          <PosterImg src={title.poster_url} alt={title.name} />
        </div>
        <div className="col" style={{ gap: 9, flex: 1 }}>
          <h1 className="ttl" style={{ fontSize: "clamp(28px, 4.5vw, 40px)" }}>{title.name}</h1>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {tags.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
            <span className="chip">
              {seasons.length} season{seasons.length === 1 ? "" : "s"}
            </span>
            {title.status_text && <span className="chip">{title.status_text}</span>}
          </div>
          {title.synopsis && (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14.5 }}>{title.synopsis}</p>
          )}
          {average !== null && (
            <div className="row">
              <span className="sc">{average.toFixed(1)}</span>
              <span className="mono-note" style={{ fontSize: 10 }}>series avg</span>
            </div>
          )}
        </div>
      </header>

      <hr className="hr" />

      {rows.length ? (
        <SeasonAccordion seasons={rows} />
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

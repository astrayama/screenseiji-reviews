import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFilmPage } from "@/lib/queries";
import { renderMarkdown } from "@/lib/markdown";
import { fmtRuntime, fmtDate } from "@/lib/util";
import { TagChip } from "@/components/TagChip";
import { PosterImg } from "@/components/PosterImg";
import { Score } from "@/components/Score";
import { normalizeEmoji } from "@/lib/emoji";
import { SubScoreBars } from "@/components/SubScoreBars";
import { SpoilerZone } from "@/components/SpoilerZone";
import { NewsletterBar } from "@/components/NewsletterBar";
import { MiniScore } from "@/components/MiniScore";
import { Reveal } from "@/components/Reveal";

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
    <article className="wrap col" style={{ gap: 22, maxWidth: 780 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {(score !== null || emoji) && <MiniScore score={score} emoji={emoji} name={title.name} />}

      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/archive?type=film">Films</Link>
        {franchise && (
          <>
            {" → "}
            <Link href={`/franchises/${franchise.slug}`}>{franchise.name}</Link>
          </>
        )}
        {" → "}
        {title.name}
      </nav>

      <header className="col" style={{ gap: 12 }}>
        <h1 className="ttl" style={{ fontSize: "clamp(32px, 5vw, 46px)" }}>
          {title.name}{" "}
          {title.year && <span style={{ fontSize: "0.55em" }}>({title.year})</span>}
        </h1>
        {/* tags first, right under the title */}
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
          {tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
          {runtime && <span className="chip">{runtime}</span>}
          {review.published_at && <span className="chip">{fmtDate(review.published_at)}</span>}
        </div>
      </header>

      {/* the verdict */}
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
        {(score !== null || emoji) && (
          <div className="col" style={{ alignItems: "center", gap: 2, flex: "none" }}>
            <Score score={score} emoji={emoji} variant="verdict" countUp />
          </div>
        )}
      </section>

      <Reveal>
        <SubScoreBars subScores={subScores} />
      </Reveal>

      {/* spoiler-free */}
      {/* a pull quote can stand on its own — it used to be hidden whenever
          there was no spoiler-free body to wrap it */}
      {(spoilerFreeHtml || review.pull_quote) && (
        <section className="col" style={{ gap: 8 }}>
          {spoilerFreeHtml && <span className="label">Spoiler-free</span>}
          {spoilerFreeHtml && <div className="prose" dangerouslySetInnerHTML={{ __html: spoilerFreeHtml }} />}
          {review.pull_quote && <div className="pull-quote">“{review.pull_quote}”</div>}
        </section>
      )}

      {spoilerHtml && <SpoilerZone html={spoilerHtml} />}

      {/* more from the franchise */}
      {franchise && otherMembers.length > 0 && (
        <Reveal>
          <section className="col" style={{ gap: 10, marginTop: 12 }}>
            <span className="label">More from {franchise.name}</span>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              {otherMembers.slice(0, 4).map((m) => (
                <Link key={m.id} href={m.kind === "film" ? `/films/${m.slug}` : `/series/${m.slug}`} className="tiltable" style={{ width: 84 }}>
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

      <Reveal>
        <NewsletterBar />
      </Reveal>
    </article>
  );
}

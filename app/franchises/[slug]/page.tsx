import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFranchisePage, scoreForRootTitle, titleHref } from "@/lib/queries";
import { splitTags } from "@/lib/util";
import { TagChip } from "@/components/TagChip";
import { PosterImg } from "@/components/PosterImg";
import { FranchiseShelf } from "@/components/FranchiseShelf";
import { Score } from "@/components/Score";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getFranchisePage(slug);
  if (!data) return { title: "Not found" };
  return {
    title: `${data.franchise.name} — every review`,
    description: data.franchise.description ?? `Every ${data.franchise.name} review in one place.`,
  };
}

export default async function FranchisePage({ params }: Props) {
  const { slug } = await params;
  const data = await getFranchisePage(slug);
  if (!data) notFound();
  const { franchise, members, cards, average, tags, reviews } = data;

  const shelfItems = members.map((m, i) => {
    const rolled = scoreForRootTitle(m.id, cards);
    const reviewed = cards.some((c) => c.rootTitle.id === m.id);
    return {
      id: m.id,
      name: m.name,
      year: m.year,
      posterUrl: m.poster_url,
      href: reviewed ? titleHref(m) : null,
      score: rolled.score,
      emoji: rolled.emoji,
      releaseOrder: m.franchise_order ?? i + 1,
    };
  });

  return (
    <div className="wrap col" style={{ gap: 36 }}>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/archive?type=film">Films</Link> › Franchises › {franchise.name}
      </nav>

      <header className="row between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
        <div className="col" style={{ gap: 14 }}>
          <span className="label">Franchise</span>
          <h1 className="ttl" style={{ fontSize: "clamp(34px, 5vw, 52px)" }}>{franchise.name}</h1>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {tags.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
            <span className="chip">
              {members.length} {members.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {franchise.description && (
            <p style={{ margin: 0, color: "var(--text)", fontSize: 16, maxWidth: 620 }}>{franchise.description}</p>
          )}
        </div>
        {average !== null && (
          <div className="col hero-score" style={{ alignItems: "center", gap: 6 }}>
            <span className="verdict-score" style={{ fontSize: 44 }}>{average.toFixed(1)}</span>
            <span className="mono-note">franchise avg</span>
          </div>
        )}
      </header>

      <FranchiseShelf items={shelfItems} />

      <Reveal>
        <section className="col" style={{ gap: 14 }}>
          <h2 className="sec-title" style={{ fontSize: 24 }}>Every review</h2>
          {reviews.length ? (
            reviews.map((c) => (
              <Link key={c.review.id} href={c.href} className="gl row between" style={{ padding: "14px 20px" }}>
                <div className="row" style={{ gap: 16 }}>
                  <div style={{ width: 44, flex: "none" }}>
                    <PosterImg src={c.posterUrl} alt="" />
                  </div>
                  <div className="col" style={{ gap: 6 }}>
                    <b style={{ font: "700 16px/1.3 var(--display)", color: "var(--bright)" }}>{c.displayName}</b>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {[...splitTags(c.tags).moods, ...splitTags(c.tags).genres]
                        .slice(0, 3)
                        .map((t) => (
                          <span
                            key={t.id}
                            className={`chip chip--tag${t.kind === "mood" ? " chip--mood" : ""}`}
                            style={{ ["--c" as string]: t.color, fontSize: 12, padding: "3px 10px" }}
                          >
                            {t.name}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
                <Score score={c.score} emoji={c.emoji} variant="pill" style={{ fontSize: 12 }} />
              </Link>
            ))
          ) : (
            <p className="mono-note">no reviews here yet</p>
          )}
        </section>
      </Reveal>
    </div>
  );
}

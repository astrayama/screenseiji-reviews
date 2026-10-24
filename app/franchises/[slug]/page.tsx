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
    <div className="wrap col" style={{ gap: 24 }}>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/archive?type=film">Films</Link> → Franchises → {franchise.name}
      </nav>

      <header className="row between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
        <div className="col" style={{ gap: 8 }}>
          <h1 className="ttl" style={{ fontSize: "clamp(30px, 4.5vw, 40px)" }}>{franchise.name}</h1>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {tags.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
            <span className="chip">
              {members.length} {members.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {franchise.description && (
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: 560 }}>{franchise.description}</p>
          )}
        </div>
        {average !== null && (
          <div className="col" style={{ alignItems: "center", gap: 2 }}>
            <span className="sc" style={{ fontSize: 16 }}>{average.toFixed(1)}</span>
            <span className="mono-note" style={{ fontSize: 10 }}>franchise avg</span>
          </div>
        )}
      </header>

      <FranchiseShelf items={shelfItems} />

      <Reveal>
        <section className="col" style={{ gap: 10 }}>
          <span className="label">Every review</span>
          {reviews.length ? (
            reviews.map((c) => (
              <Link key={c.review.id} href={c.href} className="gl row between" style={{ padding: "10px 14px" }}>
                <div className="row">
                  <div style={{ width: 30, flex: "none" }}>
                    <PosterImg src={c.posterUrl} alt="" />
                  </div>
                  <div className="col" style={{ gap: 4 }}>
                    <b style={{ color: "var(--bright)", fontSize: 14.5 }}>{c.displayName}</b>
                    <div className="row" style={{ gap: 4 }}>
                      {[...splitTags(c.tags).moods, ...splitTags(c.tags).genres]
                        .slice(0, 3)
                        .map((t) => (
                          <span
                            key={t.id}
                            className={`chip chip--tag${t.kind === "mood" ? " chip--mood" : ""}`}
                            style={{ ["--c" as string]: t.color, fontSize: 9, padding: "1px 7px" }}
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

import Link from "next/link";
import { getHomeData } from "@/lib/queries";
import { splitTags } from "@/lib/util";
import { Ticker } from "@/components/Ticker";
import { TagChip } from "@/components/TagChip";
import { PosterImg } from "@/components/PosterImg";
import { NewsletterBar } from "@/components/NewsletterBar";
import { Score } from "@/components/Score";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

/* Wireframe 4a — mood-first home with the now-reviewing rail beside the hero */
export default async function HomePage() {
  const { featured, fresh, ticker, moods, rail, total } = await getHomeData();

  return (
    <div className="wrap col" style={{ gap: 64 }}>
      {/* hero + now-reviewing rail */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.75fr 1fr",
          gap: 24,
          alignItems: "stretch",
        }}
        className="hero-grid"
      >
        {featured ? (
          <div className="hero hero--feature col" style={{ gap: 16 }}>
            {featured.posterUrl && (
              <div
                className="hero-art"
                aria-hidden="true"
                style={{ backgroundImage: `url(${JSON.stringify(featured.posterUrl)})` }}
              />
            )}
            <Link
              href={featured.href}
              className="hero-cover"
              aria-label={`Read the ${featured.displayName} review`}
            />
            <span className="label">✦ Featured pick</span>
            <h1 className="ttl" style={{ fontSize: "clamp(30px, 5vw, 60px)", maxWidth: 560 }}>
              {featured.displayName}{" "}
              {featured.rootTitle.year && (
                <span style={{ fontSize: "0.5em", color: "var(--muted)", fontWeight: 700 }}>
                  ({featured.rootTitle.year})
                </span>
              )}
            </h1>
            {featured.verdict && (
              <p style={{ margin: 0, color: "var(--text)", maxWidth: 480, fontSize: 16.5, lineHeight: 1.6 }}>
                {featured.verdict}
              </p>
            )}
            {/* moods lead, and their fill sets them apart from the genres */}
            <div className="row" style={{ flexWrap: "wrap", gap: 8, maxWidth: 520 }}>
              {[...splitTags(featured.tags).moods, ...splitTags(featured.tags).genres].map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
            </div>
            <div className="row between" style={{ marginTop: "auto", paddingTop: 18, alignItems: "flex-end", gap: 16 }}>
              <span className="btn btn--amber">
                read the review <span aria-hidden="true">→</span>
              </span>
              {(featured.score !== null || featured.emoji) && (
                <div className="hero-score">
                  <Score score={featured.score} emoji={featured.emoji} variant="verdict" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hero col empty" style={{ padding: 44, justifyContent: "center", minHeight: 460 }}>
            <h1 className="ttl" style={{ fontSize: 36 }}>The screen is still dark.</h1>
            <p className="mono-note">the first review is being written — check back soon</p>
          </div>
        )}

        <aside className="gl col" style={{ padding: 28, gap: 6 }}>
          <h2 className="sec-title" style={{ fontSize: 22, marginBottom: 10 }}>Now reviewing</h2>
          {rail.length ? (
            rail.map((item, i) => (
              <div className="row" key={item.id} style={{ gap: 16, padding: "10px 0" }}>
                <span style={{ width: 20, flex: "none", fontSize: 13, color: "var(--faint)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ width: 44, flex: "none" }}>
                  <PosterImg src={item.title?.poster_url} alt="" />
                </div>
                <div className="col" style={{ gap: 3, minWidth: 0 }}>
                  <b style={{ font: "700 15px/1.3 var(--display)", color: "var(--bright)" }}>
                    {item.title?.name ?? item.display_name}
                  </b>
                  {item.note && <span className="mono-note">{item.note}</span>}
                </div>
              </div>
            ))
          ) : (
            <p className="mono-note" style={{ margin: 0 }}>
              the queue is empty — the sage rests
            </p>
          )}
        </aside>
      </section>

      {/* browse by mood */}
      {moods.length > 0 && (
        <Reveal>
          <section className="gl row between" style={{ padding: "24px 28px", gap: 20, flexWrap: "wrap" }}>
            <div className="col" style={{ gap: 4 }}>
              <h2 className="sec-title" style={{ fontSize: 22 }}>Browse by mood</h2>
              <Link className="mono-note" href="/moods">all moods →</Link>
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {moods.slice(0, 8).map((m) => (
                <TagChip key={m.tag.id} tag={m.tag} count={m.count} />
              ))}
              {moods.length > 8 && (
                <Link className="chip" href="/moods">+ {moods.length - 8} more</Link>
              )}
            </div>
          </section>
        </Reveal>
      )}

      {/* latest ticker */}
      <Ticker cards={ticker} />

      {/* fresh takes */}
      {(fresh.length > 0 || total === 0) && (
      <Reveal delay={120}>
        <section className="col" style={{ gap: 24 }}>
          <h2 className="sec-title">Fresh takes</h2>
          {fresh.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "32px 20px" }}>
              {fresh.map((c) => {
                const { moods, genres } = splitTags(c.tags);
                /* one of each kind, so a mood is never crowded out by two
                   genres. Spans, not links — the whole card is already one. */
                const chips = [...moods.slice(0, 1), ...genres.slice(0, 1)];
                return (
                <Link key={c.review.id} href={c.href} className="tiltable col" style={{ gap: 12 }}>
                  <div className="poster-frame">
                    <PosterImg src={c.posterUrl} alt={c.displayName} />
                    <Score score={c.score} emoji={c.emoji} variant="pill" />
                  </div>
                  <b style={{ font: "700 18px/1.25 var(--display)", color: "var(--bright)" }}>{c.displayName}</b>
                  <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                    {chips.map((t) => (
                      <span
                        key={t.id}
                        className={`chip chip--tag${t.kind === "mood" ? " chip--mood" : ""}`}
                        style={{ ["--c" as string]: t.color, fontSize: 12, padding: "4px 10px" }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </Link>
                );
              })}
            </div>
          ) : (
            <p className="mono-note">reviews will gather here once they exist</p>
          )}
        </section>
      </Reveal>
      )}

      {/* newsletter */}
      <Reveal delay={200}>
        <NewsletterBar />
      </Reveal>
    </div>
  );
}

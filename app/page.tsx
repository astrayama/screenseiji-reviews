import Link from "next/link";
import { getHomeData } from "@/lib/queries";
import { Ticker } from "@/components/Ticker";
import { TagChip } from "@/components/TagChip";
import { PosterImg } from "@/components/PosterImg";
import { NewsletterBar } from "@/components/NewsletterBar";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

/* Wireframe 4a — mood-first home with the now-reviewing rail beside the hero */
export default async function HomePage() {
  const { featured, fresh, ticker, moods, rail, total } = await getHomeData();

  return (
    <div className="wrap col" style={{ gap: 30 }}>
      {/* hero + now-reviewing rail */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 14,
          alignItems: "stretch",
        }}
        className="hero-grid"
      >
        {featured ? (
          <div className="hero col" style={{ padding: 24, gap: 10 }}>
            <Link
              href={featured.href}
              className="hero-cover"
              aria-label={`Read the ${featured.displayName} review`}
            />
            <span className="label" style={{ color: "var(--amber)" }}>✦ Featured pick</span>
            <h1 className="ttl" style={{ fontSize: "clamp(30px, 5vw, 44px)" }}>
              {featured.displayName}{" "}
              {featured.rootTitle.year && (
                <span style={{ fontSize: "0.55em" }}>({featured.rootTitle.year})</span>
              )}
            </h1>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {featured.tags.map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
            </div>
            {featured.verdict && (
              <p style={{ margin: 0, color: "rgba(234,230,255,.9)", maxWidth: 520, fontSize: 16 }}>
                {featured.verdict}
              </p>
            )}
            <div className="row between" style={{ marginTop: "auto", paddingTop: 10 }}>
              <span className="mono-note">read the review →</span>
              {featured.score !== null && <span className="sc">{featured.score.toFixed(1)}</span>}
            </div>
          </div>
        ) : (
          <div className="hero col empty" style={{ padding: 34, justifyContent: "center", border: "1px solid rgba(255,217,168,.4)" }}>
            <h1 className="ttl" style={{ fontSize: 30 }}>The screen is still dark.</h1>
            <p className="mono-note">the first review is being written — check back soon</p>
          </div>
        )}

        <aside className="gl col" style={{ padding: 16, gap: 12 }}>
          <span className="label">Now reviewing</span>
          {rail.length ? (
            rail.map((item) => (
              <div className="row" key={item.id} style={{ alignItems: "flex-start" }}>
                <div style={{ width: 34, flex: "none" }}>
                  <PosterImg src={item.title?.poster_url} alt="" />
                </div>
                <div className="col" style={{ gap: 2, minWidth: 0 }}>
                  <b style={{ color: "var(--bright)", fontSize: 13.5, lineHeight: 1.25 }}>
                    {item.title?.name ?? item.display_name}
                  </b>
                  {item.note && <span className="mono-note" style={{ fontSize: 10.5 }}>{item.note}</span>}
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
          <section className="col" style={{ gap: 10 }}>
            <div className="row between">
              <h2 style={{ margin: 0, font: "600 15px var(--sans)", color: "var(--bright)" }}>
                Browse by mood
              </h2>
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
        <section className="col" style={{ gap: 12 }}>
          <h2 style={{ margin: 0, font: "600 15px var(--sans)", color: "var(--bright)" }}>
            Fresh takes
          </h2>
          {fresh.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
              {fresh.map((c, i) => (
                <Link
                  key={c.review.id}
                  href={c.href}
                  className={`tiltable col ${["gl--amber", "gl--pink", "gl--sky"][i % 3]} gl`}
                  style={{ padding: 10, gap: 8 }}
                >
                  <PosterImg src={c.posterUrl} alt={c.displayName} />
                  <b style={{ color: "var(--bright)", fontSize: 14, lineHeight: 1.3 }}>{c.displayName}</b>
                  <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
                    {c.tags.slice(0, 2).map((t) => (
                      <span key={t.id} className="chip chip--tag" style={{ ["--c" as string]: t.color, fontSize: 9, padding: "2px 8px" }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                  {c.score !== null && (
                    <span style={{ font: "600 13px var(--mono)", color: "var(--amber)" }}>
                      {c.score.toFixed(1)}
                    </span>
                  )}
                </Link>
              ))}
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

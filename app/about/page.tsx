import type { Metadata } from "next";
import { getSiteConfig, getVisibleReviewCards } from "@/lib/queries";
import { renderMarkdown } from "@/lib/markdown";
import { NewsletterBar } from "@/components/NewsletterBar";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About the critic",
  description: "Who the Sage is, and how the scores work.",
};

export default async function AboutPage() {
  const [cfg, cards] = await Promise.all([getSiteConfig(), getVisibleReviewCards()]);
  const name = cfg.critic_name || "The Sage";

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    ...(cfg.bio ? { description: cfg.bio } : {}),
    url: "/about",
  };

  return (
    <div className="wrap col" style={{ gap: 24, maxWidth: 680 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      <nav className="crumb">About</nav>

      <header className="row" style={{ gap: 22, alignItems: "flex-start" }}>
        {/* abstract mark — no face */}
        <div
          aria-hidden="true"
          style={{
            width: 96,
            height: 96,
            flex: "none",
            borderRadius: "50%",
            background: "linear-gradient(140deg, #4a3f7e, #8a6a7e)",
            border: "1.5px solid var(--amber)",
            boxShadow: "0 0 30px rgba(255,217,168,.25)",
          }}
        />
        <div className="col" style={{ gap: 8 }}>
          <h1 className="ttl" style={{ fontSize: "clamp(28px, 4vw, 38px)" }}>{name}</h1>
          {cfg.bio ? (
            <div className="prose" style={{ fontSize: 17.5 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(cfg.bio) }} />
          ) : (
            <p className="mono-note">the sage hasn&apos;t written their own story yet</p>
          )}
        </div>
      </header>

      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
        <span className="chip chip--tag" style={{ ["--c" as string]: "var(--amber)" }}>
          {cards.length} review{cards.length === 1 ? "" : "s"}
        </span>
        {cfg.established && <span className="chip">est. {cfg.established}</span>}
        <span className="chip chip--tag" style={{ ["--c" as string]: "var(--pink)" }}>
          {cfg.motto || "no algorithms, one voice"}
        </span>
      </div>

      {cfg.how_i_score && (
        <Reveal>
          <section className="col" style={{ gap: 8 }}>
            <span className="label">How I score</span>
            <div className="prose" style={{ fontSize: 17.5 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(cfg.how_i_score) }} />
          </section>
        </Reveal>
      )}

      {(cfg.press_kit_url || cfg.contact_email) && (
        <Reveal>
          <section
            className="gl gl--amber col"
            style={{
              padding: 16,
              gap: 10,
              background: "linear-gradient(115deg, rgba(255,217,168,.07), rgba(255,184,217,.05))",
            }}
          >
            <span className="label label--amber">For editors</span>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {cfg.press_kit_url && (
                <a className="chip chip--solid" href={cfg.press_kit_url} target="_blank" rel="noopener">
                  Download press kit
                </a>
              )}
              {cfg.contact_email && (
                <a className="chip" href={`mailto:${cfg.contact_email}`}>{cfg.contact_email}</a>
              )}
            </div>
          </section>
        </Reveal>
      )}

      <div className="row" style={{ gap: 6 }}>
        <a className="chip" href="/feed.xml">RSS</a>
        {cfg.bluesky_url && <a className="chip" href={cfg.bluesky_url} target="_blank" rel="noopener">Bluesky</a>}
        {cfg.youtube_url && <a className="chip" href={cfg.youtube_url} target="_blank" rel="noopener">YouTube</a>}
      </div>

      <NewsletterBar />
    </div>
  );
}

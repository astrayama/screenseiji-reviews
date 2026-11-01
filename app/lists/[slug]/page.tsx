import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getList, titleHref } from "@/lib/queries";
import { splitTags } from "@/lib/util";
import { PosterImg } from "@/components/PosterImg";
import { Score } from "@/components/Score";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const RANK_COLORS = ["var(--amber)", "var(--lav)", "var(--faint)"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getList(slug);
  if (!data) return { title: "Not found" };
  return { title: data.list.name, description: data.list.description ?? undefined };
}

export default async function ListPage({ params }: Props) {
  const { slug } = await params;
  const data = await getList(slug);
  if (!data) notFound();
  const { list, entries } = data;

  return (
    <div className="wrap col" style={{ gap: 28, maxWidth: 880 }}>
      <nav className="crumb">
        <Link href="/lists">Lists</Link> › {list.name}
      </nav>
      <header className="col" style={{ gap: 10 }}>
        <h1 className="ttl" style={{ fontSize: "clamp(34px, 4.5vw, 48px)" }}>{list.name}</h1>
        {list.description && <p style={{ margin: 0, color: "var(--text)", fontSize: 16 }}>{list.description}</p>}
      </header>
      {entries.length ? (
        <div className="gl col cascade" style={{ gap: 0, padding: "8px 24px" }}>
          {entries.map((e, i) => (
            <Link
              key={e.title.id}
              href={titleHref(e.title)}
              className="row"
              style={{ alignItems: "center", gap: 16, padding: "16px 0", borderTop: i ? "1px solid var(--hairline)" : undefined }}
            >
              <b
                style={{
                  font: "800 22px var(--display)",
                  width: 34,
                  flex: "none",
                  color: RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)],
                }}
              >
                {e.rank}
              </b>
              <div style={{ width: 52, flex: "none" }}>
                <PosterImg src={e.title.poster_url} alt="" />
              </div>
              <div className="col" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <b style={{ font: "700 17px/1.3 var(--display)", color: "var(--bright)" }}>
                  {e.title.name}
                  {e.title.year && <span className="mono-note" style={{ marginLeft: 8, fontWeight: 500 }}>{e.title.year}</span>}
                </b>
                <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                  {[...splitTags(e.tags).moods, ...splitTags(e.tags).genres]
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
                {e.blurb && <p className="mono-note" style={{ margin: 0 }}>{e.blurb}</p>}
              </div>
              <Score
                score={e.score}
                emoji={e.emoji}
                variant="pill"
                style={{ fontSize: 12, flex: "none" }}
              />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p className="mono-note" style={{ margin: 0 }}>this list is still being assembled</p>
        </div>
      )}
    </div>
  );
}

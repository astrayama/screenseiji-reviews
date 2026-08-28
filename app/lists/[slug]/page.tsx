import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getList, titleHref } from "@/lib/queries";
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
    <div className="wrap col" style={{ gap: 20, maxWidth: 720 }}>
      <nav className="crumb">
        <Link href="/lists">Lists</Link> → {list.name}
      </nav>
      <header className="col" style={{ gap: 6 }}>
        <h1 className="ttl" style={{ fontSize: "clamp(28px, 4vw, 38px)" }}>{list.name}</h1>
        {list.description && <p style={{ margin: 0, color: "var(--muted)" }}>{list.description}</p>}
      </header>
      {entries.length ? (
        <div className="col cascade" style={{ gap: 12 }}>
          {entries.map((e, i) => (
            <Link key={e.title.id} href={titleHref(e.title)} className="row" style={{ alignItems: "center" }}>
              <b
                style={{
                  font: "700 22px var(--mono)",
                  width: 34,
                  flex: "none",
                  color: RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)],
                }}
              >
                {e.rank}
              </b>
              <div style={{ width: 44, flex: "none" }}>
                <PosterImg src={e.title.poster_url} alt="" />
              </div>
              <div className="col" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <b style={{ color: "var(--bright)", fontSize: 15.5 }}>
                  {e.title.name}
                  {e.title.year && <span className="mono-note" style={{ marginLeft: 8, fontSize: 11 }}>{e.title.year}</span>}
                </b>
                <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                  {e.tags.slice(0, 3).map((t) => (
                    <span key={t.id} className="chip chip--tag" style={{ ["--c" as string]: t.color, fontSize: 9, padding: "1px 7px" }}>
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

import Link from "next/link";
import type { Metadata } from "next";
import { getLists } from "@/lib/queries";
import { PosterImg } from "@/components/PosterImg";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lists",
  description: "Rankings and collections, curated by one voice.",
};

export default async function ListsPage() {
  const lists = await getLists();
  return (
    <div className="wrap col" style={{ gap: 22 }}>
      <nav className="crumb">Lists</nav>
      <h1 className="ttl" style={{ fontSize: "clamp(28px, 4vw, 38px)" }}>Lists</h1>
      {lists.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
          {lists.map((l) => (
            <Link
              key={l.id}
              href={`/lists/${l.slug}`}
              className="gl col"
              style={{ padding: 14, gap: 8, borderColor: `color-mix(in srgb, ${l.accent} 45%, transparent)` }}
            >
              <div className="row" style={{ gap: 0 }}>
                {l.entries.slice(0, 3).map((e, i) => (
                  <div key={i} style={{ width: 40, marginLeft: i ? -18 : 0 }}>
                    <PosterImg src={e.title?.poster_url} alt="" />
                  </div>
                ))}
                {l.entries.length === 0 && (
                  <span className="mono-note" style={{ color: "var(--ghost)" }}>(empty so far)</span>
                )}
              </div>
              <b style={{ color: "var(--bright)", fontSize: 15 }}>{l.name}</b>
              <span className="mono-note" style={{ fontSize: 10.5 }}>
                {l.entries.length} {l.entries.length === 1 ? "entry" : "entries"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty col" style={{ gap: 6 }}>
          <p className="ttl" style={{ fontSize: 20, margin: 0 }}>No lists yet.</p>
          <p className="mono-note" style={{ margin: 0 }}>rankings and collections will land here</p>
        </div>
      )}
    </div>
  );
}

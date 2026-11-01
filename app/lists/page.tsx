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
    <div className="wrap col" style={{ gap: 28 }}>
      <nav className="crumb">Lists</nav>
      <h1 className="ttl" style={{ fontSize: "clamp(34px, 4.5vw, 48px)" }}>Lists</h1>
      {lists.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {lists.map((l) => (
            <Link
              key={l.id}
              href={`/lists/${l.slug}`}
              className="gl col"
              style={{ padding: 22, gap: 12, borderColor: `color-mix(in srgb, ${l.accent} 30%, var(--line))` }}
            >
              <div className="row" style={{ gap: 0 }}>
                {l.entries.slice(0, 3).map((e, i) => (
                  <div key={i} style={{ width: 64, marginLeft: i ? -24 : 0 }}>
                    <PosterImg src={e.title?.poster_url} alt="" />
                  </div>
                ))}
                {l.entries.length === 0 && (
                  <span className="mono-note" style={{ color: "var(--ghost)" }}>(empty so far)</span>
                )}
              </div>
              <b style={{ font: "800 19px/1.25 var(--display)", color: "var(--bright)" }}>{l.name}</b>
              <span className="mono-note">
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

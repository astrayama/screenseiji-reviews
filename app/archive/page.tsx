import Link from "next/link";
import type { Metadata } from "next";
import { getArchive, titleHref, ArchiveFilters } from "@/lib/queries";
import { PosterImg } from "@/components/PosterImg";
import { Score } from "@/components/Score";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Archive",
  description: "Every review, filterable by type, genre, and mood.",
};

type Props = {
  searchParams: Promise<{ type?: string; genre?: string; mood?: string; sort?: string }>;
};

function filterHref(current: ArchiveFilters, patch: Partial<ArchiveFilters>): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.type) params.set("type", next.type);
  if (next.genre) params.set("genre", next.genre);
  if (next.mood) params.set("mood", next.mood);
  if (next.sort && next.sort !== "score") params.set("sort", next.sort);
  const qs = params.toString();
  return qs ? `/archive?${qs}` : "/archive";
}

const SORTS: { key: NonNullable<ArchiveFilters["sort"]>; label: string }[] = [
  { key: "score", label: "score" },
  { key: "recent", label: "recent" },
  { key: "year", label: "year" },
  { key: "az", label: "a–z" },
];

export default async function ArchivePage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters: ArchiveFilters = {
    type: sp.type === "film" || sp.type === "series" ? sp.type : undefined,
    genre: sp.genre,
    mood: sp.mood,
    sort: (["score", "recent", "year", "az"] as const).includes(sp.sort as never)
      ? (sp.sort as ArchiveFilters["sort"])
      : "score",
  };
  const { items, genres, moods, totalReviews } = await getArchive(filters);

  return (
    <div className="wrap col" style={{ gap: 32 }}>
      <div className="row between" style={{ alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 className="ttl" style={{ fontSize: "clamp(34px, 4.5vw, 48px)" }}>The Archive</h1>
        <span className="mono-note">{totalReviews} review{totalReviews === 1 ? "" : "s"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 36, alignItems: "start" }} className="archive-grid">
        {/* filters */}
        <aside className="gl col" style={{ gap: 22, padding: 22 }}>
          <div className="col" style={{ gap: 7 }}>
            <span className="label" style={{ fontSize: 10 }}>Type</span>
            <div className="row" style={{ flexWrap: "wrap", gap: 5 }}>
              {(["film", "series"] as const).map((t) => (
                <Link
                  key={t}
                  className={filters.type === t ? "chip chip--solid" : "chip"}
                  href={filterHref(filters, { type: filters.type === t ? undefined : t })}
                >
                  {t === "film" ? "Films" : "Series"}
                </Link>
              ))}
            </div>
          </div>
          {genres.length > 0 && (
            <div className="col" style={{ gap: 7 }}>
              <span className="label" style={{ fontSize: 10 }}>Genre</span>
              <div className="row" style={{ flexWrap: "wrap", gap: 5 }}>
                {genres.map((g) => (
                  <Link
                    key={g.id}
                    className={`chip chip--tag${filters.genre === g.slug ? " is-active" : ""}`}
                    style={{ ["--c" as string]: g.color }}
                    href={filterHref(filters, { genre: filters.genre === g.slug ? undefined : g.slug })}
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {moods.length > 0 && (
            <div className="col" style={{ gap: 7 }}>
              <span className="label" style={{ fontSize: 10 }}>Mood</span>
              <div className="row" style={{ flexWrap: "wrap", gap: 5 }}>
                {moods.map((m) => (
                  <Link
                    key={m.id}
                    className={`chip chip--tag${filters.mood === m.slug ? " is-active" : ""}`}
                    style={{ ["--c" as string]: m.color }}
                    href={filterHref(filters, { mood: filters.mood === m.slug ? undefined : m.slug })}
                  >
                    {m.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="col" style={{ gap: 7 }}>
            <span className="label" style={{ fontSize: 10 }}>Sort</span>
            <div className="row" style={{ flexWrap: "wrap", gap: 5 }}>
              {SORTS.map((s) => (
                <Link
                  key={s.key}
                  className={filters.sort === s.key ? "chip chip--solid" : "chip"}
                  href={filterHref(filters, { sort: s.key })}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* grid */}
        {items.length ? (
          <div className="grid-posters cascade">
            {items.map((i) => (
              <Link key={i.title.id} href={titleHref(i.title)} className="tiltable col" style={{ gap: 10 }}>
                <div className="poster-frame">
                  <PosterImg src={i.title.poster_url} alt={i.title.name} />
                  <Score score={i.score} emoji={i.emoji} variant="pill" style={{ fontSize: 13 }} />
                </div>
                <b style={{ font: "700 16px/1.25 var(--display)", color: "var(--bright)" }}>{i.title.name}</b>
                {i.title.year && <span className="mono-note">{i.title.year}</span>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty col" style={{ gap: 8 }}>
            <p className="ttl" style={{ fontSize: 20, margin: 0 }}>Nothing here yet.</p>
            <p className="mono-note" style={{ margin: 0 }}>
              {totalReviews === 0 ? "the archive fills as reviews are published" : "no match for this filter — try loosening it"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

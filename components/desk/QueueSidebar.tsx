"use client";

import { useEffect, useState } from "react";
import { api, Library, DeskTitle, DeskReviewLite } from "./api";

type Subject =
  | { kind: "title"; id: string }
  | { kind: "season"; id: string; label: string }
  | { kind: "episode"; id: string; label: string };

type Stats = {
  days: { day: string; count: number }[];
  topPaths: { path: string; count: number }[];
  total: number;
  subscribers: number;
};

function resolveSubject(r: DeskReviewLite, titles: DeskTitle[]): { title: DeskTitle; subject: Subject; label: string } | null {
  if (r.title_id) {
    const t = titles.find((x) => x.id === r.title_id);
    return t ? { title: t, subject: { kind: "title", id: t.id }, label: t.name } : null;
  }
  for (const t of titles) {
    for (const s of t.seasons) {
      if (r.season_id === s.id) {
        return { title: t, subject: { kind: "season", id: s.id, label: `Season ${s.number} verdict` }, label: `${t.name} S${s.number}` };
      }
      const ep = s.episodes.find((e) => e.id === r.episode_id);
      if (ep) {
        return {
          title: t,
          subject: { kind: "episode", id: ep.id, label: `S${s.number}E${ep.number}${ep.name ? ` — ${ep.name}` : ""}` },
          label: `${t.name} S${s.number}E${ep.number}`,
        };
      }
    }
  }
  return null;
}

export function QueueSidebar({
  library,
  onOpen,
}: {
  library: Library;
  onOpen: (t: DeskTitle, s: Subject) => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/api/desk/stats").then(setStats).catch(() => {});
  }, []);

  const queue = library.reviews
    .map((r) => ({ r, resolved: resolveSubject(r, library.titles) }))
    .filter((x): x is { r: DeskReviewLite; resolved: NonNullable<ReturnType<typeof resolveSubject>> } => x.resolved !== null);
  const drafts = queue.filter((q) => q.r.status !== "published");
  const published = queue.filter((q) => q.r.status === "published");

  const max = Math.max(1, ...(stats?.days.map((d) => d.count) ?? [1]));
  const points = (stats?.days ?? [])
    .map((d, i) => `${(i / 29) * 100},${28 - (d.count / max) * 26}`)
    .join(" ");

  return (
    <aside className="col" style={{ gap: 14 }}>
      <div className="gl col" style={{ padding: 12, gap: 8 }}>
        <span className="label" style={{ fontSize: 10 }}>Queue</span>
        {drafts.length ? (
          drafts.map(({ r, resolved }) => (
            <button
              key={r.id}
              className="row between"
              style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }}
              onClick={() => onOpen(resolved.title, resolved.subject)}
            >
              <span style={{ fontSize: 12.5, color: "var(--bright)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {resolved.label}
              </span>
              <span
                className={r.status === "scheduled" ? "chip chip--tag" : "chip"}
                style={{ ["--c" as string]: "var(--amber)", flex: "none", fontSize: 9 }}
              >
                {r.status}
              </span>
            </button>
          ))
        ) : (
          <span className="mono-note" style={{ fontSize: 10.5 }}>no drafts waiting</span>
        )}
      </div>

      <div className="gl col" style={{ padding: 12, gap: 8 }}>
        <span className="label" style={{ fontSize: 10 }}>Stats — 30 days</span>
        {stats ? (
          <>
            <svg viewBox="0 0 100 30" style={{ width: "100%", height: 44 }} preserveAspectRatio="none" aria-label="views sparkline">
              <polyline points={points} fill="none" stroke="var(--amber)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="row between">
              <span className="mono-note" style={{ fontSize: 10.5 }}>views</span>
              <b style={{ font: "600 12px var(--mono)", color: "var(--amber)" }}>{stats.total.toLocaleString()}</b>
            </div>
            <div className="row between">
              <span className="mono-note" style={{ fontSize: 10.5 }}>subscribers</span>
              <b style={{ font: "600 12px var(--mono)", color: "var(--amber)" }}>{stats.subscribers}</b>
            </div>
            {stats.topPaths.slice(0, 4).map((p) => (
              <div className="row between" key={p.path}>
                <span className="mono-note" style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.path}
                </span>
                <span className="mono-note" style={{ fontSize: 10, color: "var(--amber)", flex: "none" }}>{p.count}</span>
              </div>
            ))}
          </>
        ) : (
          <span className="mono-note" style={{ fontSize: 10.5 }}>gathering…</span>
        )}
      </div>

      <div className="gl col" style={{ padding: 12, gap: 8 }}>
        <span className="label" style={{ fontSize: 10 }}>Published</span>
        {published.length ? (
          published.slice(0, 10).map(({ r, resolved }) => (
            <button
              key={r.id}
              className="row between"
              style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }}
              onClick={() => onOpen(resolved.title, resolved.subject)}
            >
              <span style={{ fontSize: 12.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {resolved.label}
              </span>
              <span className="row" style={{ gap: 4, flex: "none" }}>
                {r.featured && <span style={{ color: "var(--amber)", fontSize: 10 }}>✦</span>}
                {r.score !== null && (
                  <b style={{ font: "600 11px var(--mono)", color: "var(--amber)" }}>{Number(r.score).toFixed(1)}</b>
                )}
              </span>
            </button>
          ))
        ) : (
          <span className="mono-note" style={{ fontSize: 10.5 }}>nothing published yet</span>
        )}
      </div>
    </aside>
  );
}

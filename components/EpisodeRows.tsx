"use client";

import { useState } from "react";

export type EpisodeRowData = {
  number: number;
  name: string | null;
  score: number | null;
  verdict: string | null;
  bodyHtml: string | null; // pre-rendered markdown, or null if no full review
  isPeak: boolean;
};

/* Each row = one-line verdict; click expands the full episode review inline. */
export function EpisodeRows({ episodes }: { episodes: EpisodeRowData[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="col" style={{ gap: 8 }}>
      {episodes.map((e) => {
        const isOpen = open === e.number;
        const expandable = Boolean(e.bodyHtml || e.verdict);
        return (
          <div
            key={e.number}
            id={`e${e.number}`}
            className={e.isPeak || isOpen ? "gl gl--amber col" : "col"}
            style={{ padding: e.isPeak || isOpen ? "10px 14px" : "4px 2px", gap: 8, scrollMarginTop: 80 }}
          >
            <button
              onClick={() => expandable && setOpen(isOpen ? null : e.number)}
              style={{
                all: "unset",
                cursor: expandable ? "pointer" : "default",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
              }}
              aria-expanded={isOpen}
            >
              <span style={{ color: "var(--bright)", fontSize: 14.5 }}>
                <b style={{ font: "600 12.5px var(--mono)" }}>E{String(e.number).padStart(2, "0")}</b>
                {e.name && <> — {e.name}</>}
                {e.isPeak && (
                  <span className="chip chip--tag" style={{ ["--c" as string]: "var(--amber)", marginLeft: 8 }}>
                    season peak
                  </span>
                )}
              </span>
              <span className="row" style={{ flex: "none" }}>
                {e.verdict && !isOpen && (
                  <span className="mono-note" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.verdict}
                  </span>
                )}
                {e.score !== null ? (
                  <b style={{ font: "700 14px var(--mono)", color: "var(--amber)" }}>{e.score.toFixed(1)}</b>
                ) : (
                  <span className="mono-note" style={{ color: "var(--ghost)" }}>—</span>
                )}
                {expandable && <span style={{ color: "var(--faint)", fontSize: 12 }}>{isOpen ? "▴" : "▾"}</span>}
              </span>
            </button>
            {isOpen && (
              <div className="col" style={{ gap: 10 }}>
                {e.verdict && (
                  <p className="prose" style={{ margin: 0, fontSize: 17 }}>{e.verdict}</p>
                )}
                {e.bodyHtml && <div className="prose" style={{ fontSize: 17 }} dangerouslySetInnerHTML={{ __html: e.bodyHtml }} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

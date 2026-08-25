"use client";

import Link from "next/link";
import { useState } from "react";

export type SeasonRowData = {
  number: number;
  episodeCount: number | null;
  score: number | null;
  reviewingNow: boolean;
  episodeChips: { label: string; score: number }[];
  href: string;
};

/* Rows expand in place — episode chips slide out; amber outline marks the open season. */
export function SeasonAccordion({ seasons }: { seasons: SeasonRowData[] }) {
  const [open, setOpen] = useState<number | null>(
    seasons.find((s) => s.episodeChips.length)?.number ?? null
  );

  return (
    <div className="col" style={{ gap: 10 }}>
      {seasons.map((s) => {
        const isOpen = open === s.number;
        return (
          <div
            key={s.number}
            className={`gl${isOpen ? " gl--amber" : ""} col`}
            style={{ padding: "12px 15px", gap: 10 }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : s.number)}
              style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
              aria-expanded={isOpen}
            >
              <span className="row">
                <b style={{ color: "var(--bright)", fontSize: 15 }}>Season {s.number}</b>
                {s.episodeCount ? <span className="chip">{s.episodeCount} eps</span> : null}
                {s.reviewingNow && (
                  <span className="chip chip--tag" style={{ ["--c" as string]: "var(--pink)" }}>
                    reviewing now
                  </span>
                )}
              </span>
              <span className="row">
                {s.score !== null ? (
                  <span className="sc" style={{ fontSize: 12 }}>{s.score.toFixed(1)}</span>
                ) : (
                  <span className="sc sc--empty" style={{ fontSize: 12 }}>—</span>
                )}
                <span style={{ color: isOpen ? "var(--amber)" : "var(--faint)" }}>{isOpen ? "▴" : "▾"}</span>
              </span>
            </button>
            {isOpen && (
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                {s.episodeChips.map((e) => (
                  <span
                    key={e.label}
                    className="chip chip--tag"
                    style={{ ["--c" as string]: "var(--amber)" }}
                  >
                    {e.label} {e.score.toFixed(1)}
                  </span>
                ))}
                <Link className="mono-note" href={s.href} style={{ alignSelf: "center" }}>
                  → season page
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

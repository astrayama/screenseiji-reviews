"use client";

import Link from "next/link";
import { useState } from "react";
import { PosterImg } from "./PosterImg";

export type ShelfItem = {
  id: string;
  name: string;
  year: number | null;
  posterUrl: string | null;
  href: string | null; // null = unreviewed (dimmed)
  score: number | null;
  releaseOrder: number;
};

/* Shelf scrolls sideways over an amber spine; posters tilt on hover.
   Release order ↔ chronological toggle. */
export function FranchiseShelf({ items }: { items: ShelfItem[] }) {
  const [order, setOrder] = useState<"release" | "chrono">("release");
  const sorted = [...items].sort((a, b) =>
    order === "release"
      ? a.releaseOrder - b.releaseOrder
      : (a.year ?? 9999) - (b.year ?? 9999)
  );

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 6 }}>
        {(["release", "chrono"] as const).map((o) => (
          <button
            key={o}
            className={o === order ? "chip chip--solid" : "chip"}
            style={{ cursor: "pointer", background: o === order ? undefined : "none" }}
            onClick={() => setOrder(o)}
          >
            {o === "release" ? "Release order" : "Chronological"}
          </button>
        ))}
      </div>
      <div className="shelf">
        {sorted.map((m) => {
          const inner = (
            <div className="col" style={{ gap: 5 }}>
              {m.href ? (
                <PosterImg src={m.posterUrl} alt={m.name} />
              ) : (
                <div className="poster poster--empty poster--ghost">
                  {m.name}
                  <br />
                  (unreviewed)
                </div>
              )}
              <b style={{ fontSize: 13, color: m.href ? "var(--bright)" : "var(--faint)" }}>{m.name}</b>
              <span className="mono-note" style={{ fontSize: 10.5 }}>
                {m.year ?? "—"} ·{" "}
                {m.score !== null ? (
                  <b style={{ color: "var(--amber)" }}>{m.score.toFixed(1)}</b>
                ) : (
                  "—"
                )}
              </span>
            </div>
          );
          return m.href ? (
            <Link key={m.id} href={m.href} className="tiltable">
              {inner}
            </Link>
          ) : (
            <div key={m.id} style={{ opacity: 0.75 }}>
              {inner}
            </div>
          );
        })}
      </div>
      <div className="shelf-spine" />
    </div>
  );
}

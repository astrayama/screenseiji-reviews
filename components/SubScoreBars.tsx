"use client";

import { useEffect, useRef } from "react";
import type { SubScore } from "@/lib/queries";

const BAR_COLORS = ["#ffd9a8", "#ffb8d9", "#c9a8e8", "#b3e6ff", "#b8ffe3"];

/* Shown in the order set in the Desk's Tags tab; bars fill on scroll-in;
   skipped categories just don't appear. */
export function SubScoreBars({ subScores }: { subScores: SubScore[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!subScores.length) return null;

  return (
    <div ref={ref} className="bars gl col" style={{ padding: 16, gap: 9 }}>
      <span className="label">Sub-scores</span>
      {subScores.map((s) => {
        // keyed to the category's own position, so a category keeps the same
        // color on every review rather than shifting with its neighbours
        const color = BAR_COLORS[s.sort_order % BAR_COLORS.length];
        return (
          <div className="row" key={s.id}>
            <span
              style={{
                width: 130,
                flex: "none",
                fontSize: 13,
                color: "var(--bright)",
              }}
            >
              {s.category}
            </span>
            <div className="bar" style={{ ["--c" as string]: color }}>
              <div className="fill" style={{ ["--w" as string]: `${s.score * 10}%` }} />
            </div>
            <b style={{ font: "600 13px var(--mono)", color, width: 30, textAlign: "right" }}>
              {s.score.toFixed(1)}
            </b>
          </div>
        );
      })}
    </div>
  );
}

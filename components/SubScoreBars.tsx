"use client";

import { useEffect, useRef } from "react";
import type { SubScore } from "@/lib/queries";

const BAR_COLORS = ["#e6c4dd", "#c9b8f0", "#f0b8d4", "#b8cdf0", "#b8e3d4"];

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
    <div ref={ref} className="bars gl col" style={{ padding: "24px 24px 26px", gap: 18 }}>
      <span className="label">Sub-scores</span>
      {subScores.map((s) => {
        // keyed to the category's own position, so a category keeps the same
        // color on every review rather than shifting with its neighbours
        const color = BAR_COLORS[s.sort_order % BAR_COLORS.length];
        return (
          <div className="col" key={s.id} style={{ gap: 9 }}>
            <div className="row between">
              <span style={{ fontSize: 14, color: "var(--text)" }}>{s.category}</span>
              <b style={{ font: "700 14px var(--display)", color: "var(--bright)" }}>
                {s.score.toFixed(1)}
              </b>
            </div>
            <div className="bar" style={{ ["--c" as string]: color, flex: "none" }}>
              <div className="fill" style={{ ["--w" as string]: `${s.score * 10}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

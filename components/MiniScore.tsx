"use client";

import { useEffect, useState } from "react";
import { Score } from "./Score";

/* Sticky mini-score pill once the hero verdict scrolls away (mobile + desktop). */
export function MiniScore({
  score,
  emoji,
  name,
}: {
  score: number | null;
  emoji?: string | null;
  name: string;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const anchor = document.getElementById("verdict-box");
    if (!anchor) return;
    const io = new IntersectionObserver(
      (entries) => setOn(entries.every((e) => !e.isIntersecting && e.boundingClientRect.top < 0)),
      { threshold: 0 }
    );
    io.observe(anchor);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`mini-score row${on ? " is-on" : ""}`} aria-hidden={!on}>
      <span style={{ font: "600 11px var(--mono)", color: "var(--muted)" }}>{name}</span>
      {/* inline, not pill — the wrapper already draws the amber pill */}
      <Score score={score} emoji={emoji} variant="inline" layout="row" />
    </div>
  );
}

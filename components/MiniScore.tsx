"use client";

import { useEffect, useState } from "react";

/* Sticky mini-score pill once the hero verdict scrolls away (mobile + desktop). */
export function MiniScore({ score, name }: { score: number; name: string }) {
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
    <div className={`sc mini-score${on ? " is-on" : ""}`} aria-hidden={!on}>
      {name} · {score.toFixed(1)}
    </div>
  );
}

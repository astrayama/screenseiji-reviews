"use client";

import { useEffect, useRef, useState } from "react";

/* The verdict number counts up when it scrolls into view. The server renders
   the real score rather than the 0.0 the count starts from, so search engines
   and link previews read it; .count-up in globals.css keeps it hidden until
   the count begins, so readers don't see it drop back to zero. */
export function CountUpScore({
  score,
  className = "",
}: {
  score: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(score.toFixed(1));
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // reduced motion: the real number is already showing, and the CSS never hid it
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setDisplay((0).toFixed(1));
        setLive(true);
        const start = performance.now();
        const dur = 1100;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay((score * eased).toFixed(1));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [score]);

  return (
    <span ref={ref} className={`${className} count-up`} data-live={live || undefined}>
      {display}
    </span>
  );
}

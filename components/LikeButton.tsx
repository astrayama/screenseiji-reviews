"use client";

import { useState } from "react";

/* "Lovely review" — one like per IP, a second tap takes it back. The page
   hands in the server's count and whether this reader already liked it, so
   there's no flash on load. Optimistic, rolled back if the request fails. */
export function LikeButton({
  reviewId,
  initialCount,
  initialLiked,
}: {
  reviewId: string;
  initialCount: number;
  initialLiked: boolean;
}) {
  const [state, setState] = useState({ count: initialCount, liked: initialLiked });
  const [busy, setBusy] = useState(false);
  // pop only on a fresh like, not when the page loads already liked
  const [pop, setPop] = useState(false);

  async function toggle() {
    if (busy) return;
    const before = state;
    const like = !state.liked;
    setState({ count: Math.max(0, state.count + (like ? 1 : -1)), liked: like });
    setPop(like);
    setBusy(true);
    try {
      const res = await fetch("/api/likes", {
        method: like ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      if (!res.ok) throw new Error();
      setState(await res.json());
    } catch {
      setState(before);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row between" style={{ flexWrap: "wrap", gap: 14 }}>
      <span style={{ fontSize: 14, color: "var(--muted)" }}>
        Did this review help you find your next watch?
      </span>
      <button
        className={`like-btn${state.liked ? " is-liked" : ""}${pop && state.liked ? " pop" : ""}`}
        onClick={toggle}
        aria-pressed={state.liked}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
        </svg>
        Lovely review · {state.count}
      </button>
    </div>
  );
}

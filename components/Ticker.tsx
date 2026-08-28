import Link from "next/link";
import type { ReviewCard } from "@/lib/queries";
import { Score } from "./Score";

/* The LATEST marquee — content is doubled so the loop is seamless. */
export function Ticker({ cards }: { cards: ReviewCard[] }) {
  if (!cards.length) return null;
  const run = (key: string) => (
    <span key={key} style={{ display: "inline-flex", gap: 28 }}>
      <span className="tk-lead">LATEST ▸</span>
      {cards.map((c) => (
        <Link key={key + c.review.id} href={c.href} className="row" style={{ gap: 6 }}>
          {c.displayName}
          {/* row, not stacked — the marquee is a fixed-height single line */}
          <Score score={c.score} emoji={c.emoji} variant="inline" layout="row" />
        </Link>
      ))}
    </span>
  );
  return (
    <div className="tick" aria-hidden="true">
      <div>
        {run("a")}
        {run("b")}
      </div>
    </div>
  );
}

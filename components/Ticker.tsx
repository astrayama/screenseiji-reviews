import Link from "next/link";
import type { ReviewCard } from "@/lib/queries";

/* The LATEST marquee — content is doubled so the loop is seamless. */
export function Ticker({ cards }: { cards: ReviewCard[] }) {
  if (!cards.length) return null;
  const run = (key: string) => (
    <span key={key} style={{ display: "inline-flex", gap: 28 }}>
      <span className="tk-lead">LATEST ▸</span>
      {cards.map((c) => (
        <Link key={key + c.review.id} href={c.href}>
          {c.displayName} <b>{c.score?.toFixed(1)}</b>
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

import type { CSSProperties } from "react";
import { emojiLabel } from "@/lib/emoji";
import { fmtScore } from "@/lib/util";
import { CountUpScore } from "./CountUpScore";

/**
 * The one place a review's score is rendered.
 *
 * Where an emoji is set it leads, with the number beneath it, smaller.
 * Where it isn't, this renders exactly what the site rendered before —
 * that's the regression contract.
 *
 * Never used for aggregates (series/franchise averages): you can't average
 * a feeling, so those keep their own plain numeric pills.
 */
export function Score({
  score,
  emoji,
  variant = "inline",
  layout = "stack",
  empty = "none",
  countUp = false,
  className = "",
  style,
}: {
  score: number | null;
  emoji?: string | null;
  variant?: "verdict" | "pill" | "inline";
  layout?: "stack" | "row";
  empty?: "dash" | "none";
  countUp?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const hasEmoji = Boolean(emoji);
  const hasScore = score !== null && score !== undefined;

  /* ---- neither ---- */
  if (!hasEmoji && !hasScore) {
    if (empty === "none") return null;
    return variant === "pill" ? (
      <span className={`sc sc--empty ${className}`} style={style}>
        —
      </span>
    ) : (
      <span className={`mono-note ${className}`} style={{ color: "var(--ghost)", ...style }}>
        —
      </span>
    );
  }

  const label = emoji ? emojiLabel(emoji) : null;
  const emojiNode = hasEmoji ? (
    <span className="score-emoji" role="img" aria-label={label ?? "score"}>
      {emoji}
    </span>
  ) : null;

  // With an emoji the number is demoted; without one it keeps the exact class
  // the site used before, so emoji-less reviews render unchanged.
  const numberClass = hasEmoji
    ? "score-num"
    : variant === "verdict"
      ? "verdict-score"
      : undefined;

  const numberNode = hasScore ? (
    variant === "verdict" && countUp ? (
      <CountUpScore score={score as number} className={numberClass} />
    ) : (
      <span className={numberClass}>{fmtScore(score)}</span>
    )
  ) : null;

  const outOf10 = hasScore ? <span className="sr-only"> out of 10</span> : null;

  /* ---- verdict: the film page's big moment ---- */
  if (variant === "verdict") {
    return (
      <span
        className={`score score--stack score--verdict ${className}`}
        style={style}
      >
        {emojiNode}
        {numberNode}
        {outOf10}
        {hasScore && (
          <span className="mono-note" style={{ fontSize: 10 }} aria-hidden="true">
            / 10
          </span>
        )}
      </span>
    );
  }

  const inner = (
    <>
      {emojiNode}
      {numberNode}
      {outOf10}
    </>
  );

  const stackClass = `score score--${hasEmoji ? layout : "row"}`;

  /* ---- pill: the amber-outlined .sc ---- */
  if (variant === "pill") {
    return (
      <span
        className={`sc ${hasEmoji ? "has-emoji" : ""} ${stackClass} ${className}`}
        style={style}
      >
        {inner}
      </span>
    );
  }

  /* ---- inline: bare number inside rows and captions ---- */
  return (
    <span className={`${stackClass} score--inline ${className}`} style={style}>
      {inner}
    </span>
  );
}

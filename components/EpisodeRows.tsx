import Link from "next/link";
import { Score } from "./Score";
import { episodeTitle } from "@/lib/queries";

export type EpisodeRowData = {
  number: number;
  name: string | null;
  score: number | null;
  emoji: string | null;
  verdict: string | null;
  /* null when the episode has no review — it still lists, it just isn't a link */
  href: string | null;
  isPeak: boolean;
};

/* One row per episode. Reviewed ones open their own page; the rest sit quietly.
   The id={"e"+n} anchors are kept so older shared links still land nearby. */
export function EpisodeRows({ episodes }: { episodes: EpisodeRowData[] }) {
  return (
    <div className="gl col" style={{ padding: "8px 10px", gap: 2 }}>
      {episodes.map((e) => {
        const inner = (
          <>
            <span style={{ color: e.href ? "var(--bright)" : "var(--muted)", fontSize: 15 }}>
              <b style={{ font: "500 13px var(--sans)", color: e.isPeak ? "var(--amber)" : "var(--faint)", marginRight: 14 }}>
                E{String(e.number).padStart(2, "0")}
              </b>
              <span style={{ fontFamily: "var(--display)", fontWeight: 700 }}>{episodeTitle(e.name, e.number)}</span>
              {e.isPeak && (
                <span className="chip chip--tag chip--mood" style={{ ["--c" as string]: "var(--amber)", marginLeft: 10, fontSize: 12, padding: "3px 10px" }}>
                  ✦ season peak
                </span>
              )}
            </span>
            <span className="row" style={{ flex: "none", gap: 8 }}>
              {e.verdict && (
                <span
                  className="mono-note"
                  style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {e.verdict}
                </span>
              )}
              <Score
                score={e.score}
                emoji={e.emoji}
                variant="inline"
                empty="dash"
                style={{ fontSize: 14, fontWeight: 700 }}
              />
              {e.href && <span style={{ color: "var(--faint)", fontSize: 12 }}>›</span>}
            </span>
          </>
        );

        const shared = {
          id: `e${e.number}`,
          className: "row between",
          style: {
            padding: "14px 14px",
            gap: 12,
            alignItems: "baseline" as const,
            borderRadius: 14,
            background: e.isPeak ? "color-mix(in srgb, var(--amber) 8%, transparent)" : undefined,
            scrollMarginTop: 80,
          },
        };

        return e.href ? (
          <Link key={e.number} href={e.href} {...shared}>
            {inner}
          </Link>
        ) : (
          <div key={e.number} {...shared}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

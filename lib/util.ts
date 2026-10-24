export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

export function fmtScore(score: number | string | null | undefined): string {
  if (score === null || score === undefined || score === "") return "—";
  return Number(score).toFixed(1);
}

export function fmtRuntime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

// Default pastel palette for tags — from the design's chip colors.
/* Moods are Isa's own vocabulary; genres come from TMDB. Every surface that
   shows both keeps them apart, so the split lives in one place. Generic over
   the row shape so the desk's own tag type works here too. */
export function splitTags<T extends { kind: "genre" | "mood" }>(tags: T[]): { moods: T[]; genres: T[] } {
  return {
    moods: tags.filter((t) => t.kind === "mood"),
    genres: tags.filter((t) => t.kind === "genre"),
  };
}

export const TAG_COLORS = ["#b3e6ff", "#ffb8d9", "#ffd9a8", "#c9a8e8", "#b8ffe3"];

export function pickTagColor(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length];
}

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

/* What a Desk score box keeps as you type. A comma becomes a point (some
   keyboards and phone number pads type "4,5"), a second point is ignored
   rather than turning "7.5." into something unreadable, and only one digit
   follows the point, since the database keeps one decimal. */
export function typeScore(raw: string): string {
  const s = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s;
  return s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 1);
}

/* A typed score as the number to save: null when there's nothing to read
   ("" or a lone "."), otherwise held to 0–10 at one decimal. */
export function readScore(text: string): number | null {
  const n = parseFloat(text);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(10, Math.max(0, n)) * 10) / 10;
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

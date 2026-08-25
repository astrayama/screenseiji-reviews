"use client";

export async function api<T = Record<string, unknown>>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    ...(json !== undefined
      ? { body: JSON.stringify(json), headers: { "Content-Type": "application/json", ...rest.headers } }
      : {}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? res.statusText);
  return body as T;
}

/* ----- shared desk types ----- */

export type DeskTag = {
  id: string;
  slug: string;
  name: string;
  kind: "genre" | "mood";
  color: string;
  sort_order: number;
};

export type DeskEpisode = { id: string; number: number; name: string | null };
export type DeskSeason = {
  id: string;
  number: number;
  name: string | null;
  episode_count: number | null;
  episodes: DeskEpisode[];
};

export type DeskTitle = {
  id: string;
  slug: string;
  kind: "film" | "series";
  name: string;
  year: number | null;
  runtime_minutes: number | null;
  synopsis: string | null;
  poster_url: string | null;
  status_text: string | null;
  franchise_id: string | null;
  franchise: { id: string; name: string; slug: string } | null;
  seasons: DeskSeason[];
};

export type DeskReviewLite = {
  id: string;
  title_id: string | null;
  season_id: string | null;
  episode_id: string | null;
  status: string;
  score: number | null;
  featured: boolean;
  publish_at: string | null;
};

export type DeskReview = DeskReviewLite & {
  verdict: string | null;
  pull_quote: string | null;
  body_spoiler_free: string | null;
  body_spoilers: string | null;
  published_at: string | null;
};

export type Category = { id: string; name: string; sort_order: number };

export type Library = {
  titles: DeskTitle[];
  reviews: DeskReviewLite[];
  titleTags: { title_id: string; tag_id: string }[];
};

// Thin TMDB (themoviedb.org) client. Accepts either a v3 API key or a
// v4 Read Access Token in TMDB_API_KEY — both work.

const BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export function tmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_API_KEY);
}

async function tmdb(path: string, params: Record<string, string> = {}) {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);
  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  return res.json();
}

export type TmdbHit = {
  tmdbId: number;
  kind: "film" | "series";
  name: string;
  year: number | null;
  posterUrl: string | null;
  overview: string;
};

export async function searchTmdb(query: string): Promise<TmdbHit[]> {
  const [movies, tv] = await Promise.all([
    tmdb("/search/movie", { query }),
    tmdb("/search/tv", { query }),
  ]);
  const hits: TmdbHit[] = [
    ...movies.results.map((m: Record<string, unknown>) => ({
      tmdbId: m.id as number,
      kind: "film" as const,
      name: m.title as string,
      year: m.release_date ? Number(String(m.release_date).slice(0, 4)) : null,
      posterUrl: m.poster_path ? TMDB_IMG + m.poster_path : null,
      overview: (m.overview as string) || "",
      popularity: (m.popularity as number) || 0,
    })),
    ...tv.results.map((t: Record<string, unknown>) => ({
      tmdbId: t.id as number,
      kind: "series" as const,
      name: t.name as string,
      year: t.first_air_date ? Number(String(t.first_air_date).slice(0, 4)) : null,
      posterUrl: t.poster_path ? TMDB_IMG + t.poster_path : null,
      overview: (t.overview as string) || "",
      popularity: (t.popularity as number) || 0,
    })),
  ]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 12);
  return hits;
}

export async function movieDetails(id: number) {
  return tmdb(`/movie/${id}`);
}

export async function tvDetails(id: number) {
  return tmdb(`/tv/${id}`);
}

export async function tvSeason(id: number, seasonNumber: number) {
  return tmdb(`/tv/${id}/season/${seasonNumber}`);
}

export async function collectionDetails(id: number) {
  return tmdb(`/collection/${id}`);
}

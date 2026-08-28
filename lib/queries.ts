import { db } from "./supabase";
import { avg } from "./util";
import { normalizeEmoji } from "./emoji";

/* ---------- row types ---------- */

export type Tag = {
  id: string;
  slug: string;
  name: string;
  kind: "genre" | "mood";
  color: string;
  sort_order: number;
};

export type Franchise = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tmdb_collection_id: number | null;
};

export type Title = {
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
  franchise_order: number | null;
  franchise?: Franchise | null;
};

export type Season = {
  id: string;
  title_id: string;
  number: number;
  name: string | null;
  year: number | null;
  episode_count: number | null;
  title?: Title;
};

export type Episode = {
  id: string;
  season_id: string;
  number: number;
  name: string | null;
  season?: Season;
};

export type Review = {
  id: string;
  title_id: string | null;
  season_id: string | null;
  episode_id: string | null;
  score: number | null;
  emoji: string | null;
  verdict: string | null;
  pull_quote: string | null;
  body_spoiler_free: string | null;
  body_spoilers: string | null;
  status: string;
  featured: boolean;
  publish_at: string | null;
  published_at: string | null;
  title?: Title | null;
  season?: (Season & { title: Title }) | null;
  episode?: (Episode & { season: Season & { title: Title } }) | null;
};

export type SubScore = { id: string; category: string; score: number; sort_order: number };

/* A review resolved against its subject, ready to render. */
export type ReviewCard = {
  review: Review;
  rootTitle: Title;
  seasonNumber: number | null;
  episodeNumber: number | null;
  displayName: string;
  href: string;
  posterUrl: string | null;
  score: number | null;
  emoji: string | null;
  verdict: string | null;
  date: string | null;
  tags: Tag[];
};

const REVIEW_SELECT = `*,
  title:titles(*, franchise:franchises(*)),
  season:seasons(*, title:titles(*, franchise:franchises(*))),
  episode:episodes(*, season:seasons(*, title:titles(*, franchise:franchises(*))))`;

export function titleHref(t: Title): string {
  return t.kind === "film" ? `/films/${t.slug}` : `/series/${t.slug}`;
}

function resolveCard(r: Review, tagsByTitle: Map<string, Tag[]>): ReviewCard | null {
  let rootTitle: Title | undefined;
  let seasonNumber: number | null = null;
  let episodeNumber: number | null = null;
  let displayName = "";
  let href = "";

  if (r.title) {
    rootTitle = r.title;
    displayName = r.title.name;
    href = titleHref(r.title);
  } else if (r.season) {
    rootTitle = r.season.title;
    seasonNumber = r.season.number;
    displayName = `${rootTitle.name} — Season ${r.season.number}`;
    href = `/series/${rootTitle.slug}/seasons/${r.season.number}`;
  } else if (r.episode) {
    rootTitle = r.episode.season.title;
    seasonNumber = r.episode.season.number;
    episodeNumber = r.episode.number;
    const ep = r.episode.name ? ` — ${r.episode.name}` : "";
    displayName = `${rootTitle.name} S${seasonNumber}E${episodeNumber}${ep}`;
    href = `/series/${rootTitle.slug}/seasons/${seasonNumber}#e${episodeNumber}`;
  }
  if (!rootTitle) return null;

  return {
    review: r,
    rootTitle,
    seasonNumber,
    episodeNumber,
    displayName,
    href,
    posterUrl: rootTitle.poster_url,
    score: r.score === null ? null : Number(r.score),
    emoji: normalizeEmoji(r.emoji),
    verdict: r.verdict,
    date: r.published_at ?? r.publish_at,
    tags: tagsByTitle.get(rootTitle.id) ?? [],
  };
}

async function tagMap(): Promise<Map<string, Tag[]>> {
  const { data, error } = await db()
    .from("title_tags")
    .select("title_id, tag:tags(*)");
  if (error) throw error;
  const map = new Map<string, Tag[]>();
  for (const row of (data ?? []) as unknown as { title_id: string; tag: Tag }[]) {
    if (!row.tag) continue;
    const arr = map.get(row.title_id) ?? [];
    arr.push(row.tag);
    map.set(row.title_id, arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return map;
}

/* All published reviews as resolved cards, newest first. */
export async function getVisibleReviewCards(): Promise<ReviewCard[]> {
  const [{ data, error }, tags] = await Promise.all([
    db().from("reviews").select(REVIEW_SELECT),
    tagMap(),
  ]);
  if (error) throw error;
  const cards = ((data ?? []) as unknown as Review[])
    .map((r) => resolveCard(r, tags))
    .filter((c): c is ReviewCard => c !== null);
  cards.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return cards;
}

export type RootScore = { score: number | null; emoji: string | null };

/* Score shown for a root title: film → its own review; series → avg of season
   reviews, falling back to avg of episode reviews.
   The emoji rides along ONLY on the single-film branch — an average of several
   reviews has no single feeling, so both aggregate branches return null. */
export function scoreForRootTitle(titleId: string, cards: ReviewCard[]): RootScore {
  const ofTitle = cards.filter((c) => c.rootTitle.id === titleId);

  // the film branch first, and before the score filter, so an emoji-only
  // film review still surfaces its emoji
  const film = ofTitle.find((c) => c.review.title_id);
  if (film) return { score: film.score, emoji: film.emoji };

  const scored = ofTitle.filter((c) => c.score !== null);
  const seasons = scored.filter((c) => c.review.season_id).map((c) => c.score as number);
  if (seasons.length) return { score: avg(seasons), emoji: null };
  const eps = scored.filter((c) => c.review.episode_id).map((c) => c.score as number);
  return { score: avg(eps), emoji: null };
}

/* ---------- home ---------- */

export type NowReviewingItem = {
  id: string;
  note: string;
  display_name: string | null;
  title: Title | null;
  sort_order: number;
};

export async function getHomeData() {
  const [cards, moods, rail] = await Promise.all([
    getVisibleReviewCards(),
    getMoodCounts(),
    getNowReviewing(),
  ]);
  const featured = cards.find((c) => c.review.featured) ?? cards[0] ?? null;
  const fresh = cards.filter((c) => c !== featured).slice(0, 3);
  const ticker = cards.filter((c) => c.score !== null || c.emoji).slice(0, 8);
  return { featured, fresh, ticker, moods, rail, total: cards.length };
}

export async function getNowReviewing(): Promise<NowReviewingItem[]> {
  const { data, error } = await db()
    .from("now_reviewing")
    .select("id, note, display_name, sort_order, title:titles(*)")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as NowReviewingItem[];
}

export async function getMoodCounts(): Promise<{ tag: Tag; count: number }[]> {
  const [cards, { data, error }] = await Promise.all([
    getVisibleReviewCards(),
    db().from("tags").select("*").order("sort_order").order("name"),
  ]);
  if (error) throw error;
  // count each reviewed root title once per tag
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const c of cards) {
    if (seen.has(c.rootTitle.id)) continue;
    seen.add(c.rootTitle.id);
    for (const t of c.tags) counts.set(t.id, (counts.get(t.id) ?? 0) + 1);
  }
  return ((data ?? []) as Tag[])
    .filter((t) => t.kind === "mood")
    .map((tag) => ({ tag, count: counts.get(tag.id) ?? 0 }))
    .filter((m) => m.count > 0);
}

/* ---------- film page ---------- */

export async function getFilmPage(slug: string) {
  const { data: title, error } = await db()
    .from("titles")
    .select("*, franchise:franchises(*)")
    .eq("slug", slug)
    .eq("kind", "film")
    .maybeSingle();
  if (error) throw error;
  if (!title) return null;

  const t = title as unknown as Title;
  const [{ data: review }, tags, siblings] = await Promise.all([
    db().from("reviews").select("*").eq("title_id", t.id).maybeSingle(),
    titleTags(t.id),
    t.franchise_id ? franchiseMembers(t.franchise_id) : Promise.resolve([]),
  ]);

  let subScores: SubScore[] = [];
  if (review) {
    subScores = await reviewSubScores((review as Review).id);
  }
  return { title: t, review: review as Review | null, tags, subScores, siblings };
}

export async function titleTags(titleId: string): Promise<Tag[]> {
  const { data, error } = await db()
    .from("title_tags")
    .select("tag:tags(*)")
    .eq("title_id", titleId);
  if (error) throw error;
  return ((data ?? []) as unknown as { tag: Tag }[])
    .map((r) => r.tag)
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export async function reviewSubScores(reviewId: string): Promise<SubScore[]> {
  const { data, error } = await db()
    .from("review_subscores")
    .select("score, category:subscore_categories(id, name, sort_order)")
    .eq("review_id", reviewId);
  if (error) throw error;
  // Bars follow the order set in the Desk's Tags tab, not the scores.
  // Name tiebreak covers categories created after the sort_order backfill.
  return ((data ?? []) as unknown as { score: number; category: { id: string; name: string; sort_order: number } }[])
    .map((r) => ({
      id: r.category.id,
      category: r.category.name,
      score: Number(r.score),
      sort_order: r.category.sort_order,
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.category.localeCompare(b.category));
}

async function franchiseMembers(franchiseId: string): Promise<Title[]> {
  const { data, error } = await db()
    .from("titles")
    .select("*")
    .eq("franchise_id", franchiseId)
    .order("franchise_order", { ascending: true, nullsFirst: false })
    .order("year");
  if (error) throw error;
  return (data ?? []) as Title[];
}

/* ---------- franchise page ---------- */

export async function getFranchisePage(slug: string) {
  const { data: franchise, error } = await db()
    .from("franchises")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!franchise) return null;
  const f = franchise as Franchise;
  const [members, cards] = await Promise.all([
    franchiseMembers(f.id),
    getVisibleReviewCards(),
  ]);
  const memberScores = members
    .map((m) => scoreForRootTitle(m.id, cards).score)
    .filter((s): s is number => s !== null);
  const tagsSeen = new Map<string, Tag>();
  for (const c of cards) {
    if (c.rootTitle.franchise_id === f.id) for (const t of c.tags) tagsSeen.set(t.id, t);
  }
  const reviews = cards.filter((c) => c.rootTitle.franchise_id === f.id);
  return {
    franchise: f,
    members,
    cards,
    average: avg(memberScores),
    tags: [...tagsSeen.values()],
    reviews,
  };
}

/* ---------- series + season pages ---------- */

export async function getSeriesPage(slug: string) {
  const { data: title, error } = await db()
    .from("titles")
    .select("*, franchise:franchises(*)")
    .eq("slug", slug)
    .eq("kind", "series")
    .maybeSingle();
  if (error) throw error;
  if (!title) return null;
  const t = title as unknown as Title;

  const [{ data: seasons, error: se }, tags, cards] = await Promise.all([
    db().from("seasons").select("*").eq("title_id", t.id).order("number"),
    titleTags(t.id),
    getVisibleReviewCards(),
  ]);
  if (se) throw se;

  const seasonRows = (seasons ?? []) as Season[];
  const bySeason = seasonRows.map((s) => {
    const seasonReview = cards.find((c) => c.review.season_id === s.id);
    const episodeCards = cards
      .filter((c) => c.review.episode_id && c.review.episode?.season.id === s.id)
      .sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
    return { season: s, seasonReview: seasonReview ?? null, episodeCards };
  });
  const seasonScores = bySeason
    .map((s) => s.seasonReview?.score ?? null)
    .filter((s): s is number => s !== null);
  const epScores = bySeason.flatMap((s) => s.episodeCards.map((c) => c.score)).filter((s): s is number => s !== null);
  return {
    title: t,
    tags,
    seasons: bySeason,
    average: seasonScores.length ? avg(seasonScores) : avg(epScores),
  };
}

export async function getSeasonPage(slug: string, num: number) {
  const series = await getSeriesPage(slug);
  if (!series) return null;
  const entry = series.seasons.find((s) => s.season.number === num);
  if (!entry) return null;

  const { data: episodes, error } = await db()
    .from("episodes")
    .select("*")
    .eq("season_id", entry.season.id)
    .order("number");
  if (error) throw error;

  const epRows = (episodes ?? []) as Episode[];
  const withReviews = epRows.map((ep) => ({
    episode: ep,
    card: entry.episodeCards.find((c) => c.review.episode_id === ep.id) ?? null,
  }));
  let subScores: SubScore[] = [];
  if (entry.seasonReview) subScores = await reviewSubScores(entry.seasonReview.review.id);
  const scores = withReviews.map((e) => e.card?.score).filter((s): s is number => s != null);
  const peak = scores.length ? Math.max(...scores) : null;
  return { series, entry, episodes: withReviews, subScores, peak };
}

/* ---------- archive ---------- */

export type ArchiveFilters = {
  type?: "film" | "series";
  genre?: string; // tag slug
  mood?: string; // tag slug
  sort?: "score" | "recent" | "year" | "az";
};

export async function getArchive(filters: ArchiveFilters) {
  const cards = await getVisibleReviewCards();
  const seen = new Map<
    string,
    { title: Title; tags: Tag[]; score: number | null; emoji: string | null; latest: string }
  >();
  for (const c of cards) {
    const existing = seen.get(c.rootTitle.id);
    if (!existing) {
      const rolled = scoreForRootTitle(c.rootTitle.id, cards);
      seen.set(c.rootTitle.id, {
        title: c.rootTitle,
        tags: c.tags,
        score: rolled.score,
        emoji: rolled.emoji,
        latest: c.date ?? "",
      });
    } else if ((c.date ?? "") > existing.latest) {
      existing.latest = c.date ?? "";
    }
  }
  let items = [...seen.values()];
  if (filters.type) items = items.filter((i) => i.title.kind === filters.type);
  if (filters.genre) items = items.filter((i) => i.tags.some((t) => t.slug === filters.genre && t.kind === "genre"));
  if (filters.mood) items = items.filter((i) => i.tags.some((t) => t.slug === filters.mood && t.kind === "mood"));
  const sort = filters.sort ?? "score";
  items.sort((a, b) => {
    if (sort === "score") return (b.score ?? -1) - (a.score ?? -1);
    if (sort === "recent") return b.latest.localeCompare(a.latest);
    if (sort === "year") return (b.title.year ?? 0) - (a.title.year ?? 0);
    return a.title.name.localeCompare(b.title.name);
  });

  const { data: tagRows, error } = await db().from("tags").select("*").order("sort_order").order("name");
  if (error) throw error;
  const usedTagIds = new Set([...seen.values()].flatMap((i) => i.tags.map((t) => t.id)));
  const allTags = ((tagRows ?? []) as Tag[]).filter((t) => usedTagIds.has(t.id));
  return { items, genres: allTags.filter((t) => t.kind === "genre"), moods: allTags.filter((t) => t.kind === "mood"), totalReviews: cards.length };
}

/* ---------- lists ---------- */

export async function getLists() {
  const { data, error } = await db()
    .from("lists")
    .select("*, entries:list_entries(rank, blurb, title:titles(*))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  type Entry = { rank: number; blurb: string | null; title: Title };
  return ((data ?? []) as unknown as (Franchise & { accent: string; description: string | null; entries: Entry[] })[]).map((l) => ({
    ...l,
    entries: [...l.entries].sort((a, b) => a.rank - b.rank),
  }));
}

export async function getList(slug: string) {
  const lists = await getLists();
  const list = lists.find((l) => l.slug === slug);
  if (!list) return null;
  const cards = await getVisibleReviewCards();
  const tags = await tagMap();
  return {
    list,
    entries: list.entries.map((e) => {
      const rolled = scoreForRootTitle(e.title.id, cards);
      return {
        ...e,
        score: rolled.score,
        emoji: rolled.emoji,
        tags: tags.get(e.title.id) ?? [],
      };
    }),
  };
}

/* ---------- search ---------- */

export async function searchSite(q: string) {
  const like = `%${q}%`;
  const [cards, { data: franchises, error }] = await Promise.all([
    getVisibleReviewCards(),
    db().from("franchises").select("*").ilike("name", like).limit(5),
  ]);
  if (error) throw error;
  const titleHits = new Map<
    string,
    { title: Title; tags: Tag[]; score: number | null; emoji: string | null }
  >();
  for (const c of cards) {
    if (c.rootTitle.name.toLowerCase().includes(q.toLowerCase()) && !titleHits.has(c.rootTitle.id)) {
      const rolled = scoreForRootTitle(c.rootTitle.id, cards);
      titleHits.set(c.rootTitle.id, {
        title: c.rootTitle,
        tags: c.tags,
        score: rolled.score,
        emoji: rolled.emoji,
      });
    }
  }
  const hits = [...titleHits.values()];
  const franchiseHits = ((franchises ?? []) as Franchise[]).map((f) => ({
    franchise: f,
    count: cards.filter((c) => c.rootTitle.franchise_id === f.id).length,
  }));
  return {
    franchises: franchiseHits,
    films: hits.filter((h) => h.title.kind === "film"),
    series: hits.filter((h) => h.title.kind === "series"),
  };
}

/* ---------- site config ---------- */

export type SiteConfig = {
  critic_name?: string;
  tagline?: string;
  bio?: string;
  how_i_score?: string;
  established?: string;
  motto?: string;
  contact_email?: string;
  press_kit_url?: string;
  bluesky_url?: string;
  youtube_url?: string;
  photo_url?: string;
};

export async function getSiteConfig(): Promise<SiteConfig> {
  const { data, error } = await db().from("site_config").select("key, value");
  if (error) throw error;
  const cfg: Record<string, unknown> = {};
  for (const row of (data ?? []) as { key: string; value: unknown }[]) cfg[row.key] = row.value;
  return cfg as SiteConfig;
}

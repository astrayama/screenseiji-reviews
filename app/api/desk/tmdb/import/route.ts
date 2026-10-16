import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";
import { movieDetails, tvDetails, tvSeason, collectionDetails, TMDB_IMG } from "@/lib/tmdb";
import { slugify, pickTagColor } from "@/lib/util";

async function uniqueSlug(base: string, year: number | null): Promise<string> {
  const db = adminDb();
  const candidates = [slugify(base), slugify(`${base}-${year ?? ""}`), `${slugify(base)}-${Date.now() % 10000}`];
  for (const c of candidates) {
    const { data } = await db.from("titles").select("id").eq("slug", c).maybeSingle();
    if (!data) return c;
  }
  return candidates[2];
}

async function ensureGenreTags(names: string[]): Promise<string[]> {
  const db = adminDb();
  const ids: string[] = [];
  const { count } = await db.from("tags").select("id", { count: "exact", head: true });
  let colorIndex = count ?? 0;

  // Start new genres after the last one so they don't all tie at sort_order 0,
  // which makes reordering in the Tags tab behave unpredictably.
  const { data: last } = await db
    .from("tags")
    .select("sort_order")
    .eq("kind", "genre")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let sortOrder = (last?.sort_order ?? -1) + 1;

  for (const name of names) {
    const slug = slugify(name);
    // Match on kind too: a mood may now share a slug with a genre, and
    // attaching the mood here would silently mis-tag the title.
    const { data: existing } = await db
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .eq("kind", "genre")
      .maybeSingle();
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const { data: created, error } = await db
      .from("tags")
      .insert({ slug, name, kind: "genre", color: pickTagColor(colorIndex++), sort_order: sortOrder++ })
      .select("id")
      .single();
    if (!error && created) ids.push(created.id);
  }
  return ids;
}

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { tmdbId?: number; kind?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  const { tmdbId, kind } = body;
  if (!tmdbId || (kind !== "film" && kind !== "series")) return jsonError("tmdbId and kind required");

  const db = adminDb();
  const { data: already } = await db
    .from("titles")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .eq("kind", kind)
    .maybeSingle();
  if (already) return NextResponse.json({ title: already, existed: true });

  try {
    if (kind === "film") {
      const m = await movieDetails(tmdbId);
      const year = m.release_date ? Number(String(m.release_date).slice(0, 4)) : null;

      // franchise detected → nests automatically
      let franchiseId: string | null = null;
      let franchiseOrder: number | null = null;
      if (m.belongs_to_collection) {
        const col = m.belongs_to_collection as { id: number; name: string };
        const { data: existingF } = await db
          .from("franchises")
          .select("id")
          .eq("tmdb_collection_id", col.id)
          .maybeSingle();
        if (existingF) franchiseId = existingF.id;
        else {
          const cleanName = col.name.replace(/ Collection$/i, "");
          const { data: createdF, error: fe } = await db
            .from("franchises")
            .insert({
              slug: slugify(cleanName),
              name: cleanName,
              tmdb_collection_id: col.id,
            })
            .select("id")
            .single();
          if (fe) throw fe;
          franchiseId = createdF.id;
        }
        try {
          const details = await collectionDetails(col.id);
          const parts = (details.parts as { id: number; release_date?: string }[])
            .filter((p) => p.release_date)
            .sort((a, b) => (a.release_date ?? "").localeCompare(b.release_date ?? ""));
          const idx = parts.findIndex((p) => p.id === tmdbId);
          if (idx >= 0) franchiseOrder = idx + 1;
        } catch {
          /* ordering is a nicety — skip on failure */
        }
      }

      const slug = await uniqueSlug(m.title, year);
      const { data: title, error } = await db
        .from("titles")
        .insert({
          slug,
          kind: "film",
          name: m.title,
          year,
          runtime_minutes: m.runtime || null,
          synopsis: m.overview || null,
          poster_url: m.poster_path ? TMDB_IMG + m.poster_path : null,
          franchise_id: franchiseId,
          franchise_order: franchiseOrder,
          tmdb_id: tmdbId,
        })
        .select("*, franchise:franchises(*)")
        .single();
      if (error) throw error;

      const tagIds = await ensureGenreTags((m.genres ?? []).map((g: { name: string }) => g.name));
      if (tagIds.length) {
        await db.from("title_tags").insert(tagIds.map((tag_id) => ({ title_id: title.id, tag_id })));
      }
      return NextResponse.json({ title });
    }

    // series
    const t = await tvDetails(tmdbId);
    const year = t.first_air_date ? Number(String(t.first_air_date).slice(0, 4)) : null;
    const slug = await uniqueSlug(t.name, year);
    const { data: title, error } = await db
      .from("titles")
      .insert({
        slug,
        kind: "series",
        name: t.name,
        year,
        synopsis: t.overview || null,
        poster_url: t.poster_path ? TMDB_IMG + t.poster_path : null,
        status_text: t.status === "Returning Series" ? "Ongoing" : t.status || null,
        tmdb_id: tmdbId,
      })
      .select("*")
      .single();
    if (error) throw error;

    const tagIds = await ensureGenreTags((t.genres ?? []).map((g: { name: string }) => g.name));
    if (tagIds.length) {
      await db.from("title_tags").insert(tagIds.map((tag_id) => ({ title_id: title.id, tag_id })));
    }

    // seasons + episodes (skip "specials" season 0)
    const seasonList = (t.seasons as {
      season_number: number; name: string; episode_count: number; air_date?: string; poster_path?: string | null;
    }[]).filter((s) => s.season_number > 0);
    for (const s of seasonList) {
      const { data: season, error: se } = await db
        .from("seasons")
        .insert({
          title_id: title.id,
          number: s.season_number,
          name: s.name || null,
          year: s.air_date ? Number(String(s.air_date).slice(0, 4)) : null,
          episode_count: s.episode_count || null,
          poster_url: s.poster_path ? TMDB_IMG + s.poster_path : null,
        })
        .select("id")
        .single();
      if (se) throw se;
      try {
        const detail = await tvSeason(tmdbId, s.season_number);
        const eps = (detail.episodes as { episode_number: number; name?: string }[]).map((e) => ({
          season_id: season.id,
          number: e.episode_number,
          name: e.name || null,
        }));
        if (eps.length) await db.from("episodes").insert(eps);
      } catch {
        // fall back to bare numbered episodes
        if (s.episode_count) {
          await db.from("episodes").insert(
            Array.from({ length: s.episode_count }, (_, i) => ({
              season_id: season.id,
              number: i + 1,
            }))
          );
        }
      }
    }
    return NextResponse.json({ title });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "import failed", 502);
  }
}

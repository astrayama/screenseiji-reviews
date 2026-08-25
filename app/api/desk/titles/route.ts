import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";
import { slugify } from "@/lib/util";

export async function GET() {
  const denied = await requireDesk();
  if (denied) return denied;
  const db = adminDb();
  const [{ data: titles, error }, { data: reviews }, { data: titleTags }] = await Promise.all([
    db
      .from("titles")
      .select("*, franchise:franchises(*), seasons(id, number, name, episode_count, episodes(id, number, name))")
      .order("created_at", { ascending: false }),
    db.from("reviews").select("id, title_id, season_id, episode_id, status, score, featured, publish_at"),
    db.from("title_tags").select("title_id, tag_id"),
  ]);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ titles: titles ?? [], reviews: reviews ?? [], titleTags: titleTags ?? [] });
}

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: {
    kind?: string;
    name?: string;
    year?: number | null;
    runtime_minutes?: number | null;
    synopsis?: string | null;
    poster_url?: string | null;
    seasons?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if ((body.kind !== "film" && body.kind !== "series") || !body.name?.trim()) {
    return jsonError("kind and name required");
  }
  const db = adminDb();
  let slug = slugify(body.name);
  const { data: taken } = await db.from("titles").select("id").eq("slug", slug).maybeSingle();
  if (taken) slug = slugify(`${body.name}-${body.year ?? Date.now() % 10000}`);

  const { data: title, error } = await db
    .from("titles")
    .insert({
      slug,
      kind: body.kind,
      name: body.name.trim(),
      year: body.year ?? null,
      runtime_minutes: body.runtime_minutes ?? null,
      synopsis: body.synopsis ?? null,
      poster_url: body.poster_url ?? null,
    })
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ title });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { id?: string } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  const { id, ...rest } = body;
  if (!id) return jsonError("id required");
  const allowed = [
    "name", "year", "runtime_minutes", "synopsis", "poster_url",
    "status_text", "franchise_id", "franchise_order",
  ];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in rest) patch[k] = rest[k];
  if (!Object.keys(patch).length) return jsonError("nothing to update");
  const { data, error } = await adminDb().from("titles").update(patch).eq("id", id).select("*").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ title: data });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id required");
  const { error } = await adminDb().from("titles").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

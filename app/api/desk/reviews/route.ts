import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";
import { clampEmoji, normalizeEmoji } from "@/lib/emoji";

const SUBJECTS = ["title_id", "season_id", "episode_id"] as const;

export async function GET(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const db = adminDb();
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const [{ data: review, error }, { data: subs }] = await Promise.all([
      db.from("reviews").select("*").eq("id", id).single(),
      db.from("review_subscores").select("category_id, score").eq("review_id", id),
    ]);
    if (error) return jsonError(error.message, 404);
    return NextResponse.json({ review, subScores: subs ?? [] });
  }
  const { data, error } = await db
    .from("reviews")
    .select(
      `*, title:titles(id, name, slug, kind, poster_url),
       season:seasons(id, number, title:titles(id, name, slug)),
       episode:episodes(id, number, name, season:seasons(id, number, title:titles(id, name, slug)))`
    )
    .order("updated_at", { ascending: false });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  const subject = SUBJECTS.filter((s) => body[s]);
  if (subject.length !== 1) return jsonError("exactly one of title_id / season_id / episode_id required");
  const key = subject[0];
  const db = adminDb();
  const { data: existing } = await db.from("reviews").select("*").eq(key, body[key] as string).maybeSingle();
  if (existing) return NextResponse.json({ review: existing, existed: true });
  const { data, error } = await db
    .from("reviews")
    .insert({ [key]: body[key] })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      // concurrent create (e.g. React strict-mode double effect) — return the winner
      const { data: winner } = await db.from("reviews").select("*").eq(key, body[key] as string).maybeSingle();
      if (winner) return NextResponse.json({ review: winner, existed: true });
    }
    return jsonError(error.message, 500);
  }
  return NextResponse.json({ review: data });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { id?: string; action?: string; subScores?: { category_id: string; score: number }[] } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  const { id, action, subScores, ...rest } = body;
  if (!id) return jsonError("id required");
  const db = adminDb();

  const patch: Record<string, unknown> = {};
  const allowed = ["score", "emoji", "verdict", "pull_quote", "body_spoiler_free", "body_spoilers", "publish_at"];
  for (const k of allowed) if (k in rest) patch[k] = rest[k];

  if ("emoji" in patch) {
    // Array.from, never String.slice — slicing by UTF-16 unit bisects a
    // surrogate pair and stores half an emoji.
    const raw = patch.emoji;
    patch.emoji =
      typeof raw === "string"
        ? clampEmoji(normalizeEmoji(raw) ?? "", 16) || null
        : null;
  }

  if (action === "publish") {
    patch.status = "published";
    patch.published_at = new Date().toISOString();
    patch.publish_at = null;
  } else if (action === "schedule") {
    if (!patch.publish_at && !rest.publish_at) return jsonError("publish_at required to schedule");
    patch.status = "scheduled";
    patch.published_at = null;
  } else if (action === "unpublish") {
    patch.status = "draft";
    patch.published_at = null;
    patch.featured = false;
  } else if (action === "feature") {
    // single featured pick — clear the rest first
    await db.from("reviews").update({ featured: false }).eq("featured", true);
    patch.featured = true;
  } else if (action === "unfeature") {
    patch.featured = false;
  }

  if (Object.keys(patch).length) {
    const { error } = await db.from("reviews").update(patch).eq("id", id);
    if (error) return jsonError(error.message, 500);
  }

  if (subScores) {
    await db.from("review_subscores").delete().eq("review_id", id);
    const rows = subScores
      .filter((s) => s.category_id && typeof s.score === "number" && s.score >= 0 && s.score <= 10)
      .map((s) => ({ review_id: id, category_id: s.category_id, score: s.score }));
    if (rows.length) {
      const { error } = await db.from("review_subscores").insert(rows);
      if (error) return jsonError(error.message, 500);
    }
  }

  const { data: review, error: re } = await db.from("reviews").select("*").eq("id", id).single();
  if (re) return jsonError(re.message, 500);
  return NextResponse.json({ review });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id required");
  const { error } = await adminDb().from("reviews").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

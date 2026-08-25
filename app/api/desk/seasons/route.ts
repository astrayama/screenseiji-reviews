import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";

/* Manual season creation for hand-added series (TMDB imports come pre-seasoned). */
export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { title_id?: string; number?: number; episode_count?: number };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  const { title_id, number, episode_count } = body;
  if (!title_id || !number || number < 1) return jsonError("title_id and number required");
  const db = adminDb();
  const { data: season, error } = await db
    .from("seasons")
    .insert({ title_id, number, episode_count: episode_count ?? null })
    .select("id")
    .single();
  if (error) return jsonError(error.message, 500);
  if (episode_count && episode_count > 0 && episode_count <= 100) {
    await db.from("episodes").insert(
      Array.from({ length: episode_count }, (_, i) => ({ season_id: season.id, number: i + 1 }))
    );
  }
  return NextResponse.json({ ok: true, seasonId: season.id });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id required");
  const { error } = await adminDb().from("seasons").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

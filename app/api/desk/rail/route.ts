import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";

export async function GET() {
  const denied = await requireDesk();
  if (denied) return denied;
  const { data, error } = await adminDb()
    .from("now_reviewing")
    .select("*, title:titles(id, name, poster_url)")
    .order("sort_order");
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { title_id?: string | null; display_name?: string | null; note?: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.title_id && !body.display_name?.trim()) return jsonError("link a title or give it a name");
  const { data, error } = await adminDb()
    .from("now_reviewing")
    .insert({
      title_id: body.title_id ?? null,
      display_name: body.display_name?.trim() || null,
      note: body.note?.trim() ?? "",
      sort_order: body.sort_order ?? 0,
    })
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ item: data });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { id?: string; note?: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.id) return jsonError("id required");
  const patch: Record<string, unknown> = {};
  if (typeof body.note === "string") patch.note = body.note.trim();
  if (typeof body.sort_order === "number") patch.sort_order = body.sort_order;
  const { error } = await adminDb().from("now_reviewing").update(patch).eq("id", body.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id required");
  const { error } = await adminDb().from("now_reviewing").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

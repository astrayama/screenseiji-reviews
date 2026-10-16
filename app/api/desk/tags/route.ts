import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";
import { slugify } from "@/lib/util";

export async function GET() {
  const denied = await requireDesk();
  if (denied) return denied;
  const { data, error } = await adminDb().from("tags").select("*").order("kind").order("sort_order").order("name");
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ tags: data ?? [] });
}

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { name?: string; kind?: string; color?: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.name?.trim()) return jsonError("name required");
  const kind = body.kind === "genre" ? "genre" : "mood";
  const color = /^#[0-9a-f]{6}$/i.test(body.color ?? "") ? body.color : "#c9a8e8";
  const db = adminDb();

  // land new tags at the end of their kind rather than tying at 0
  let sortOrder = body.sort_order;
  if (typeof sortOrder !== "number") {
    const { data: last } = await db
      .from("tags")
      .select("sort_order")
      .eq("kind", kind)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (last?.sort_order ?? -1) + 1;
  }

  const { data, error } = await db
    .from("tags")
    .insert({ name: body.name.trim(), slug: slugify(body.name), kind, color, sort_order: sortOrder })
    .select("*")
    .single();
  if (error) {
    // Uniqueness is per kind, so a clash can only be within the same kind.
    if (error.code === "23505") {
      return jsonError(`you already have a ${kind} called "${body.name.trim()}"`, 409);
    }
    return jsonError(error.message, 400);
  }
  return NextResponse.json({ tag: data });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: {
    id?: string;
    name?: string;
    kind?: string;
    color?: string;
    sort_order?: number;
    order?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }

  // --- bulk reorder ---
  // Sending the whole order (rather than swapping two rows) stays correct even
  // when sort_order values tie. Not transactional; the next reorder repairs a
  // partial write.
  if (Array.isArray(body.order)) {
    if (body.id) return jsonError("send either id or order, not both");
    const db = adminDb();
    for (const [index, id] of body.order.entries()) {
      const { error } = await db.from("tags").update({ sort_order: index }).eq("id", id);
      if (error) return jsonError(error.message, 500);
    }
    const { data } = await db.from("tags").select("*").order("kind").order("sort_order").order("name");
    return NextResponse.json({ tags: data ?? [] });
  }

  if (!body.id) return jsonError("id required");
  const patch: Record<string, unknown> = {};
  if (body.name?.trim()) {
    // Only the display name changes. The slug is assigned at creation and
    // frozen, so /archive?mood=cozy keeps working after a rename.
    patch.name = body.name.trim();
  }
  if (body.kind === "genre" || body.kind === "mood") patch.kind = body.kind;
  if (body.color && /^#[0-9a-f]{6}$/i.test(body.color)) patch.color = body.color;
  if (typeof body.sort_order === "number") patch.sort_order = body.sort_order;
  const { data, error } = await adminDb().from("tags").update(patch).eq("id", body.id).select("*").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ tag: data });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id required");
  const { error } = await adminDb().from("tags").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";

export async function GET() {
  const denied = await requireDesk();
  if (denied) return denied;
  const { data, error } = await adminDb()
    .from("subscore_categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { name?: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.name?.trim()) return jsonError("name required");
  const db = adminDb();

  // land new categories at the end rather than tying at 0
  let sortOrder = body.sort_order;
  if (typeof sortOrder !== "number") {
    const { data: last } = await db
      .from("subscore_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (last?.sort_order ?? -1) + 1;
  }

  const { data, error } = await db
    .from("subscore_categories")
    .insert({ name: body.name.trim(), sort_order: sortOrder })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return jsonError(`a category called "${body.name.trim()}" already exists`, 409);
    return jsonError(error.message, 400);
  }
  return NextResponse.json({ category: data });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { id?: string; name?: string; sort_order?: number; order?: string[] };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  const db = adminDb();

  // --- bulk reorder ---
  // Sending the whole order (rather than swapping two rows) keeps this
  // idempotent and correct even when sort_order values tie.
  // Not transactional: a mid-loop failure leaves a partial order, which the
  // next reorder repairs. Acceptable for a single-author desk.
  if (Array.isArray(body.order)) {
    if (body.id) return jsonError("send either id or order, not both");
    for (const [index, id] of body.order.entries()) {
      const { error } = await db.from("subscore_categories").update({ sort_order: index }).eq("id", id);
      if (error) return jsonError(error.message, 500);
    }
    const { data } = await db.from("subscore_categories").select("*").order("sort_order").order("name");
    return NextResponse.json({ categories: data ?? [] });
  }

  // --- single row: rename and/or reposition ---
  // Renaming is data-safe: review_subscores joins on category_id, so every
  // existing sub-score follows the new name.
  if (!body.id) return jsonError("id required");
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return jsonError("a category needs a name");
    patch.name = name;
  }
  if (typeof body.sort_order === "number") patch.sort_order = body.sort_order;
  if (!Object.keys(patch).length) return jsonError("nothing to update");

  const { data, error } = await db
    .from("subscore_categories")
    .update(patch)
    .eq("id", body.id)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return jsonError(`a category called "${patch.name}" already exists`, 409);
    return jsonError(error.message, 500);
  }
  return NextResponse.json({ category: data });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id required");
  const { error } = await adminDb().from("subscore_categories").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";
import { slugify } from "@/lib/util";

export async function GET() {
  const denied = await requireDesk();
  if (denied) return denied;
  const { data, error } = await adminDb()
    .from("franchises")
    .select("*, titles(id)")
    .order("name");
  if (error) return jsonError(error.message, 500);
  const franchises = (data ?? []).map((f: Record<string, unknown>) => ({
    ...f,
    memberCount: Array.isArray(f.titles) ? f.titles.length : 0,
    titles: undefined,
  }));
  return NextResponse.json({ franchises });
}

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.name?.trim()) return jsonError("name required");
  const { data, error } = await adminDb()
    .from("franchises")
    .insert({
      name: body.name.trim(),
      slug: slugify(body.name),
      description: body.description?.trim() || null,
    })
    .select("*")
    .single();
  if (error) return jsonError(error.code === "23505" ? "a franchise with that name exists" : error.message, 400);
  return NextResponse.json({ franchise: data });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { id?: string; name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.id) return jsonError("id required");
  const patch: Record<string, unknown> = {};
  if (body.name?.trim()) patch.name = body.name.trim(); // slug stays stable so links don't break
  if (typeof body.description === "string") patch.description = body.description.trim() || null;
  if (!Object.keys(patch).length) return jsonError("nothing to update");
  const { data, error } = await adminDb().from("franchises").update(patch).eq("id", body.id).select("*").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ franchise: data });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id required");
  // titles keep existing — their franchise_id becomes null (FK on delete set null)
  const { error } = await adminDb().from("franchises").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

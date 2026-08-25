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
  let body: { name?: string; kind?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.name?.trim()) return jsonError("name required");
  const kind = body.kind === "genre" ? "genre" : "mood";
  const color = /^#[0-9a-f]{6}$/i.test(body.color ?? "") ? body.color : "#c9a8e8";
  const { data, error } = await adminDb()
    .from("tags")
    .insert({ name: body.name.trim(), slug: slugify(body.name), kind, color })
    .select("*")
    .single();
  if (error) return jsonError(error.code === "23505" ? "a tag with that name exists" : error.message, 400);
  return NextResponse.json({ tag: data });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { id?: string; name?: string; kind?: string; color?: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.id) return jsonError("id required");
  const patch: Record<string, unknown> = {};
  if (body.name?.trim()) {
    patch.name = body.name.trim();
    patch.slug = slugify(body.name);
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

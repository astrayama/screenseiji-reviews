import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";
import { slugify } from "@/lib/util";

export async function GET() {
  const denied = await requireDesk();
  if (denied) return denied;
  const { data, error } = await adminDb()
    .from("lists")
    .select("*, entries:list_entries(rank, blurb, title:titles(id, name, year, poster_url))")
    .order("created_at", { ascending: false });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ lists: data ?? [] });
}

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { name?: string; description?: string; accent?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.name?.trim()) return jsonError("name required");
  const { data, error } = await adminDb()
    .from("lists")
    .insert({
      name: body.name.trim(),
      slug: slugify(body.name),
      description: body.description?.trim() || null,
      accent: /^#[0-9a-f]{6}$/i.test(body.accent ?? "") ? body.accent : "#ffd9a8",
    })
    .select("*")
    .single();
  if (error) return jsonError(error.code === "23505" ? "a list with that name exists" : error.message, 400);
  return NextResponse.json({ list: data });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: {
    id?: string;
    name?: string;
    description?: string;
    accent?: string;
    published?: boolean;
    entries?: { title_id: string; rank: number; blurb?: string | null }[];
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.id) return jsonError("id required");
  const db = adminDb();
  const patch: Record<string, unknown> = {};
  if (body.name?.trim()) patch.name = body.name.trim();
  if (typeof body.description === "string") patch.description = body.description.trim() || null;
  if (body.accent && /^#[0-9a-f]{6}$/i.test(body.accent)) patch.accent = body.accent;
  if (typeof body.published === "boolean") patch.published = body.published;
  if (Object.keys(patch).length) {
    const { error } = await db.from("lists").update(patch).eq("id", body.id);
    if (error) return jsonError(error.message, 500);
  }
  if (body.entries) {
    await db.from("list_entries").delete().eq("list_id", body.id);
    const rows = body.entries
      .filter((e) => e.title_id && Number.isInteger(e.rank))
      .map((e) => ({ list_id: body.id, title_id: e.title_id, rank: e.rank, blurb: e.blurb || null }));
    if (rows.length) {
      const { error } = await db.from("list_entries").insert(rows);
      if (error) return jsonError(error.message, 500);
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("id required");
  const { error } = await adminDb().from("lists").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

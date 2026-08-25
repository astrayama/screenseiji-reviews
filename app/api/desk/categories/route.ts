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
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.name?.trim()) return jsonError("name required");
  const { data, error } = await adminDb()
    .from("subscore_categories")
    .insert({ name: body.name.trim() })
    .select("*")
    .single();
  if (error) return jsonError(error.code === "23505" ? "that category exists" : error.message, 400);
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

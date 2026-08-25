import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: { title_id?: string; tag_id?: string; on?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  const { title_id, tag_id, on } = body;
  if (!title_id || !tag_id) return jsonError("title_id and tag_id required");
  const db = adminDb();
  if (on) {
    const { error } = await db.from("title_tags").upsert({ title_id, tag_id });
    if (error) return jsonError(error.message, 500);
  } else {
    const { error } = await db.from("title_tags").delete().eq("title_id", title_id).eq("tag_id", tag_id);
    if (error) return jsonError(error.message, 500);
  }
  return NextResponse.json({ ok: true });
}

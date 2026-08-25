import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const form = await req.formData();
  const file = form.get("file");
  const titleId = form.get("title_id");
  if (!(file instanceof File) || typeof titleId !== "string") {
    return jsonError("file and title_id required");
  }
  const ext = TYPES[file.type];
  if (!ext) return jsonError("use a JPEG, PNG, or WebP image");
  if (file.size > 5 * 1024 * 1024) return jsonError("keep posters under 5MB");

  const db = adminDb();
  const path = `${titleId}-${Date.now()}.${ext}`;
  const { error } = await db.storage
    .from("posters")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (error) return jsonError(error.message, 500);

  const { data: pub } = db.storage.from("posters").getPublicUrl(path);
  const { error: te } = await db.from("titles").update({ poster_url: pub.publicUrl }).eq("id", titleId);
  if (te) return jsonError(te.message, 500);
  return NextResponse.json({ url: pub.publicUrl });
}

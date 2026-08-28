import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/* Critic photo for the About page — stored in the posters bucket under site/,
   its public URL kept in site_config.photo_url. */
export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("file required");
  const ext = TYPES[file.type];
  if (!ext) return jsonError("use a JPEG, PNG, or WebP image");
  if (file.size > 5 * 1024 * 1024) return jsonError("keep the photo under 5MB");

  const db = adminDb();
  const path = `site/critic-photo-${Date.now()}.${ext}`;
  const { error } = await db.storage
    .from("posters")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (error) return jsonError(error.message, 500);

  const { data: pub } = db.storage.from("posters").getPublicUrl(path);
  const { error: ce } = await db.from("site_config").upsert({ key: "photo_url", value: pub.publicUrl });
  if (ce) return jsonError(ce.message, 500);
  return NextResponse.json({ url: pub.publicUrl });
}

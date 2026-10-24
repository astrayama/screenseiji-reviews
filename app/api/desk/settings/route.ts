import { NextRequest, NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";

const KEYS = [
  "critic_name", "tagline", "bio", "how_i_score", "established", "motto",
  "contact_email", "press_kit_url", "instagram_url", "tiktok_url", "youtube_url", "photo_url",
];

export async function GET() {
  const denied = await requireDesk();
  if (denied) return denied;
  const { data, error } = await adminDb().from("site_config").select("key, value");
  if (error) return jsonError(error.message, 500);
  const cfg: Record<string, unknown> = {};
  for (const row of data ?? []) cfg[row.key] = row.value;
  return NextResponse.json({ config: cfg });
}

export async function PUT(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  const db = adminDb();
  for (const key of KEYS) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value === "" || value === null) {
      await db.from("site_config").delete().eq("key", key);
    } else {
      const { error } = await db.from("site_config").upsert({ key, value });
      if (error) return jsonError(error.message, 500);
    }
  }
  return NextResponse.json({ ok: true });
}

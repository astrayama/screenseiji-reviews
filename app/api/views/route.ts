import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  let path: unknown;
  try {
    ({ path } = await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof path !== "string" || !path.startsWith("/") || path.length > 200 || path.startsWith("/desk")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const day = new Date().toISOString().slice(0, 10);
  const db = adminDb();
  // read-modify-write is fine at a single-critic site's traffic level
  const { data } = await db
    .from("page_views")
    .select("count")
    .eq("path", path)
    .eq("day", day)
    .maybeSingle();
  if (data) {
    await db.from("page_views").update({ count: data.count + 1 }).eq("path", path).eq("day", day);
  } else {
    await db.from("page_views").insert({ path, day, count: 1 });
  }
  return NextResponse.json({ ok: true });
}

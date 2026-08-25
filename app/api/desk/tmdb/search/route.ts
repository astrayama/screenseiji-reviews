import { NextRequest, NextResponse } from "next/server";
import { requireDesk } from "@/lib/deskAuth";
import { searchTmdb, tmdbConfigured } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;
  if (!tmdbConfigured()) return NextResponse.json({ configured: false, hits: [] });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ configured: true, hits: [] });
  try {
    const hits = await searchTmdb(q);
    return NextResponse.json({ configured: true, hits });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "TMDB search failed" },
      { status: 502 }
    );
  }
}

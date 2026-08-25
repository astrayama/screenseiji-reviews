import { NextRequest, NextResponse } from "next/server";
import { searchSite } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) {
    return NextResponse.json({ franchises: [], films: [], series: [] });
  }
  const results = await searchSite(q);
  return NextResponse.json(results);
}

import { NextResponse } from "next/server";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";

export async function GET() {
  const denied = await requireDesk();
  if (denied) return denied;
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const db = adminDb();
  const [{ data: rows, error }, { count: subCount }] = await Promise.all([
    db.from("page_views").select("path, day, count").gte("day", since),
    db.from("subscribers").select("id", { count: "exact", head: true }).is("unsubscribed_at", null),
  ]);
  if (error) return jsonError(error.message, 500);

  const byDay = new Map<string, number>();
  const byPath = new Map<string, number>();
  for (const r of rows ?? []) {
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.count);
    byPath.set(r.path, (byPath.get(r.path) ?? 0) + r.count);
  }
  const days: { day: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    days.push({ day, count: byDay.get(day) ?? 0 });
  }
  const topPaths = [...byPath.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const total = days.reduce((a, d) => a + d.count, 0);
  return NextResponse.json({ days, topPaths, total, subscribers: subCount ?? 0 });
}

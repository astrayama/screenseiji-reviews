import { createHmac } from "node:crypto";
import { adminDb } from "./supabase";

export type LikeState = { count: number; liked: boolean };

/* One like per IP. Vercel overwrites both headers with the real client
   address, so a reader can't spoof their way to a second like. The IP is
   hashed before it goes anywhere near the database. */
export function voterFromHeaders(h: Headers): string {
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET");
  return createHmac("sha256", secret).update(`like:${ip}`).digest("hex");
}

export async function getLikeState(reviewId: string, voter: string): Promise<LikeState> {
  const db = adminDb();
  const [{ count }, { data: mine }] = await Promise.all([
    db.from("review_likes").select("review_id", { count: "exact", head: true }).eq("review_id", reviewId),
    db.from("review_likes").select("review_id").eq("review_id", reviewId).eq("voter", voter).maybeSingle(),
  ]);
  return { count: count ?? 0, liked: Boolean(mine) };
}

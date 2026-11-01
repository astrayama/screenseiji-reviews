import { NextRequest, NextResponse } from "next/server";
import { db, adminDb } from "@/lib/supabase";
import { getLikeState, voterFromHeaders } from "@/lib/likes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* POST likes, DELETE takes the like back. Both answer with the fresh count. */
export async function POST(req: NextRequest) {
  return toggle(req, true);
}

export async function DELETE(req: NextRequest) {
  return toggle(req, false);
}

async function toggle(req: NextRequest, like: boolean) {
  let reviewId: unknown;
  try {
    ({ reviewId } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (typeof reviewId !== "string" || !UUID.test(reviewId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  // the public client only sees published reviews, so drafts can't be liked
  const { data: review } = await db().from("reviews").select("id").eq("id", reviewId).maybeSingle();
  if (!review) return NextResponse.json({ error: "no such review" }, { status: 400 });

  const voter = voterFromHeaders(req.headers);
  const likes = adminDb().from("review_likes");
  const { error } = like
    ? await likes.upsert({ review_id: reviewId, voter }, { ignoreDuplicates: true })
    : await likes.delete().eq("review_id", reviewId).eq("voter", voter);
  if (error) return NextResponse.json({ error: "something went sideways" }, { status: 500 });

  return NextResponse.json(await getLikeState(reviewId, voter));
}

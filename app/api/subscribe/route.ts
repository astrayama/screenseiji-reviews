import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: "that doesn't look like an email" }, { status: 400 });
  }

  const db = adminDb();
  const { data: existing } = await db
    .from("subscribers")
    .select("id, unsubscribed_at")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.unsubscribed_at) {
      await db.from("subscribers").update({ unsubscribed_at: null }).eq("id", existing.id);
      return NextResponse.json({ message: "welcome back — you're in again" });
    }
    return NextResponse.json({ message: "you were already in ✦" });
  }

  const { error } = await db.from("subscribers").insert({ email });
  if (error) return NextResponse.json({ error: "something went sideways" }, { status: 500 });
  return NextResponse.json({ message: "you're in — dispatches incoming" });
}

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { createSessionToken, sessionCookie } from "@/lib/session";

function safeCompare(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Best-effort brute-force brake: 8 failures per IP per 10 minutes.
// Per-instance memory — a determined attacker still needs the password;
// this just makes guessing slow and noisy.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 8;
const fails = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
  // Google's front end APPENDS the real client address, so the last entry is
  // trustworthy; anything earlier can be written by the visitor to dodge the
  // brake.
  const hops = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return hops?.at(-1) || "local";
}

function tooManyFails(ip: string): boolean {
  const entry = fails.get(ip);
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.count >= MAX_FAILS;
}

function recordFail(ip: string): void {
  const entry = fails.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    fails.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export async function POST(req: NextRequest) {
  const expected = process.env.DESK_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "DESK_PASSWORD is not configured" }, { status: 500 });
  }
  const ip = clientIp(req);
  if (tooManyFails(ip)) {
    return NextResponse.json(
      { error: "too many tries — the desk is resting. come back in a few minutes" },
      { status: 429 }
    );
  }
  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (typeof password !== "string" || !safeCompare(password, expected)) {
    recordFail(ip);
    return NextResponse.json({ error: "that's not the word" }, { status: 401 });
  }
  fails.delete(ip);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie.name, token, sessionCookie.options);
  return res;
}

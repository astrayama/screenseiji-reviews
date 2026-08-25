import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken, sessionCookie } from "./session";

// Defense in depth: every /api/desk handler re-checks the session cookie
// itself rather than trusting the proxy alone.
export async function requireDesk(): Promise<NextResponse | null> {
  const jar = await cookies();
  const ok = await verifySessionToken(jar.get(sessionCookie.name)?.value);
  if (!ok) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return null;
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

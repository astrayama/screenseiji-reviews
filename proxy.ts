import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, sessionCookie } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/desk/login" || pathname === "/api/desk/login";

  const ok = await verifySessionToken(request.cookies.get(sessionCookie.name)?.value);

  if (!ok && !isLogin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/desk/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (ok && pathname === "/desk/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/desk";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // the Desk is private — never index it
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/desk/:path*", "/desk", "/api/desk/:path*"],
};

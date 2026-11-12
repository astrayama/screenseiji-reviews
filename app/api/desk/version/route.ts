import { NextResponse } from "next/server";
import { requireDesk } from "@/lib/deskAuth";

/* Which deployment is answering. An open Desk tab keeps running the code it
   loaded with, so it asks this now and then and offers a reload once the
   answer changes. Null locally, where there's no deployment to compare. */
export async function GET() {
  const denied = await requireDesk();
  if (denied) return denied;
  return NextResponse.json({
    version: process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_URL ?? null,
  });
}

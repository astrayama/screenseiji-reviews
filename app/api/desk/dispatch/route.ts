import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireDesk, jsonError } from "@/lib/deskAuth";
import { adminDb } from "@/lib/supabase";
import { renderMarkdown } from "@/lib/markdown";

function emailHtml(bodyHtml: string, siteUrl: string, unsubUrl: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#34305a;">
<div style="max-width:560px;margin:0 auto;padding:36px 24px;font-family:Georgia,serif;color:#d8d2f0;">
  <p style="font-size:20px;letter-spacing:3px;margin:0 0 26px;color:#ffd9a8;">SCREEN SAGE</p>
  <div style="font-size:17px;line-height:1.6;color:#eae6ff;">${bodyHtml}</div>
  <p style="margin:30px 0 0;"><a href="${siteUrl}" style="color:#ffd9a8;">screen sage →</a></p>
  <hr style="border:none;border-top:1px solid #4a4478;margin:30px 0 14px;">
  <p style="font-size:12px;color:#8a7fb8;font-family:monospace;">
    dispatches from the seeker · <a href="${unsubUrl}" style="color:#8a7fb8;">unsubscribe</a>
  </p>
</div></body></html>`;
}

export async function POST(req: NextRequest) {
  const denied = await requireDesk();
  if (denied) return denied;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM;
  if (!apiKey || !from) {
    return jsonError("Resend isn't configured yet — set RESEND_API_KEY and NEWSLETTER_FROM in the environment", 400);
  }

  let body: { subject?: string; markdown?: string; review_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return jsonError("bad request");
  }
  if (!body.subject?.trim() || !body.markdown?.trim()) return jsonError("subject and body required");

  const db = adminDb();
  const { data: subs, error } = await db
    .from("subscribers")
    .select("email, token")
    .is("unsubscribed_at", null);
  if (error) return jsonError(error.message, 500);
  if (!subs?.length) return jsonError("no active subscribers yet", 400);

  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const bodyHtml = renderMarkdown(body.markdown);
  const resend = new Resend(apiKey);

  let sent = 0;
  const failures: string[] = [];
  for (let i = 0; i < subs.length; i += 100) {
    const chunk = subs.slice(i, i + 100);
    const { error: sendError } = await resend.batch.send(
      chunk.map((s) => ({
        from,
        to: s.email,
        subject: body.subject!.trim(),
        html: emailHtml(bodyHtml, siteUrl, `${siteUrl}/unsubscribe?token=${s.token}`),
      }))
    );
    if (sendError) failures.push(sendError.message);
    else sent += chunk.length;
  }

  if (sent > 0) {
    await db.from("dispatches").insert({
      review_id: body.review_id ?? null,
      subject: body.subject.trim(),
      recipient_count: sent,
    });
  }
  if (failures.length && sent === 0) return jsonError(`sending failed: ${failures[0]}`, 502);
  return NextResponse.json({ sent, failed: failures.length ? failures[0] : null });
}

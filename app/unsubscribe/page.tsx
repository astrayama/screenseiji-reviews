import { adminDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = { title: "Unsubscribe", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;
  let ok = false;
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    const { data } = await adminDb()
      .from("subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("token", token)
      .is("unsubscribed_at", null)
      .select("id");
    ok = Boolean(data && data.length);
    if (!ok) {
      // token may belong to someone already unsubscribed — treat as done
      const { data: existing } = await adminDb()
        .from("subscribers")
        .select("id")
        .eq("token", token)
        .maybeSingle();
      ok = Boolean(existing);
    }
  }
  return (
    <div className="wrap col" style={{ gap: 14, maxWidth: 520, textAlign: "center", paddingTop: 60 }}>
      <h1 className="ttl" style={{ fontSize: 30 }}>
        {ok ? "You've slipped out quietly." : "That link didn't work."}
      </h1>
      <p className="mono-note">
        {ok
          ? "no more dispatches — the door stays open if you ever wander back"
          : "the unsubscribe token wasn't recognized — it may have already been used"}
      </p>
    </div>
  );
}

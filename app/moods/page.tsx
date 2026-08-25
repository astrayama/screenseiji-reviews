import type { Metadata } from "next";
import { getMoodCounts } from "@/lib/queries";
import { TagChip } from "@/components/TagChip";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse by mood",
  description: "Find something that matches the evening — every mood, counted.",
};

export default async function MoodsPage() {
  const moods = await getMoodCounts();
  return (
    <div className="wrap col" style={{ gap: 22, maxWidth: 720 }}>
      <h1 className="ttl" style={{ fontSize: "clamp(28px, 4vw, 38px)" }}>Browse by mood</h1>
      {moods.length ? (
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          {moods.map((m) => (
            <TagChip key={m.tag.id} tag={m.tag} count={m.count} />
          ))}
        </div>
      ) : (
        <div className="empty col" style={{ gap: 6 }}>
          <p className="ttl" style={{ fontSize: 20, margin: 0 }}>No moods yet.</p>
          <p className="mono-note" style={{ margin: 0 }}>moods appear once tagged reviews are published</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { api, DeskTag, Category } from "./api";
import { TAG_COLORS } from "@/lib/util";

export function TagsPanel({
  tags,
  categories,
  onChanged,
}: {
  tags: DeskTag[];
  categories: Category[];
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"mood" | "genre">("mood");
  const [color, setColor] = useState(TAG_COLORS[3]);
  const [catName, setCatName] = useState("");
  const [error, setError] = useState("");

  async function addTag() {
    if (!name.trim()) return;
    try {
      await api("/api/desk/tags", { method: "POST", json: { name, kind, color } });
      setName("");
      setError("");
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }

  async function removeTag(id: string) {
    if (!confirm("Delete this tag? It'll vanish from every title.")) return;
    await api(`/api/desk/tags?id=${id}`, { method: "DELETE" });
    await onChanged();
  }

  async function recolor(id: string, c: string) {
    await api("/api/desk/tags", { method: "PATCH", json: { id, color: c } });
    await onChanged();
  }

  async function addCategory() {
    if (!catName.trim()) return;
    try {
      await api("/api/desk/categories", { method: "POST", json: { name: catName } });
      setCatName("");
      setError("");
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }

  async function removeCategory(id: string) {
    if (!confirm("Delete this category? Its sub-scores disappear from reviews.")) return;
    await api(`/api/desk/categories?id=${id}`, { method: "DELETE" });
    await onChanged();
  }

  return (
    <div className="col" style={{ gap: 26, maxWidth: 620 }}>
      {(["mood", "genre"] as const).map((k) => (
        <section key={k} className="col" style={{ gap: 8 }}>
          <span className="label">{k === "mood" ? "Moods" : "Genres"}</span>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {tags
              .filter((t) => t.kind === k)
              .map((t) => (
                <span key={t.id} className="chip chip--tag row" style={{ ["--c" as string]: t.color, gap: 6 }}>
                  {t.name}
                  <span className="row" style={{ gap: 3 }}>
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        aria-label={`color ${c}`}
                        onClick={() => recolor(t.id, c)}
                        style={{
                          width: 10, height: 10, borderRadius: "50%", background: c, border: "none", cursor: "pointer",
                          outline: t.color === c ? "1.5px solid #fff" : "none",
                        }}
                      />
                    ))}
                  </span>
                  <button style={{ all: "unset", cursor: "pointer", color: "var(--ghost)" }} onClick={() => removeTag(t.id)}>
                    ✕
                  </button>
                </span>
              ))}
            {tags.filter((t) => t.kind === k).length === 0 && (
              <span className="mono-note">none yet {k === "genre" ? "— TMDB imports create genres automatically" : "— moods are your signature, invent a few"}</span>
            )}
          </div>
        </section>
      ))}

      <section className="gl col" style={{ padding: 14, gap: 8 }}>
        <span className="label" style={{ fontSize: 10 }}>New tag</span>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <input className="input" style={{ width: 170 }} placeholder="e.g. Melancholy" value={name} onChange={(e) => setName(e.target.value)} />
          {(["mood", "genre"] as const).map((k) => (
            <button key={k} className={kind === k ? "chip chip--solid" : "chip"} style={{ cursor: "pointer", background: kind === k ? undefined : "none" }} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
          <span className="row" style={{ gap: 4 }}>
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`color ${c}`}
                onClick={() => setColor(c)}
                style={{ width: 16, height: 16, borderRadius: "50%", background: c, border: "none", cursor: "pointer", outline: color === c ? "2px solid #fff" : "none" }}
              />
            ))}
          </span>
          <button className="btn btn--amber" onClick={addTag} disabled={!name.trim()}>add</button>
        </div>
      </section>

      <section className="col" style={{ gap: 8 }}>
        <span className="label">Sub-score categories</span>
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
          {categories.map((c) => (
            <span key={c.id} className="chip row" style={{ gap: 6 }}>
              {c.name}
              <button style={{ all: "unset", cursor: "pointer", color: "var(--ghost)" }} onClick={() => removeCategory(c.id)}>✕</button>
            </span>
          ))}
          {categories.length === 0 && (
            <span className="mono-note">e.g. Cinematography, Music &amp; Score, Acting, Casting, VFX, Direction, Writing</span>
          )}
        </div>
        <div className="row">
          <input className="input" style={{ width: 200 }} placeholder="new category" value={catName} onChange={(e) => setCatName(e.target.value)} />
          <button className="btn btn--amber" onClick={addCategory} disabled={!catName.trim()}>add</button>
        </div>
      </section>

      {error && <p className="mono-note" style={{ color: "var(--pink)" }}>{error}</p>}
    </div>
  );
}

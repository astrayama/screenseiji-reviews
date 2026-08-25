"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Library } from "./api";

type RailItem = {
  id: string;
  note: string;
  display_name: string | null;
  sort_order: number;
  title: { id: string; name: string; poster_url: string | null } | null;
};

/* The "Now Reviewing" rail on the home page — return-visit bait. */
export function RailPanel({ library }: { library: Library }) {
  const [items, setItems] = useState<RailItem[]>([]);
  const [titleId, setTitleId] = useState("");
  const [freeText, setFreeText] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const { items } = await api<{ items: RailItem[] }>("/api/desk/rail");
    setItems(items);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  async function add() {
    await api("/api/desk/rail", {
      method: "POST",
      json: {
        title_id: titleId || null,
        display_name: titleId ? null : freeText,
        note,
        sort_order: items.length,
      },
    });
    setTitleId("");
    setFreeText("");
    setNote("");
    await load();
  }

  async function remove(id: string) {
    await api(`/api/desk/rail?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.id === id);
    const other = items[idx + dir];
    if (!other) return;
    await Promise.all([
      api("/api/desk/rail", { method: "PATCH", json: { id, sort_order: idx + dir } }),
      api("/api/desk/rail", { method: "PATCH", json: { id: other.id, sort_order: idx } }),
    ]);
    await load();
  }

  async function editNote(id: string, newNote: string) {
    await api("/api/desk/rail", { method: "PATCH", json: { id, note: newNote } });
  }

  return (
    <div className="col" style={{ gap: 18, maxWidth: 560 }}>
      <span className="label">Now reviewing — the home page rail</span>
      {items.length === 0 && <p className="mono-note">empty — the home rail shows “the queue is empty” until you add something</p>}
      <div className="col" style={{ gap: 8 }}>
        {items.map((item, i) => (
          <div key={item.id} className="gl row between" style={{ padding: 10 }}>
            <div className="row" style={{ minWidth: 0 }}>
              {item.title?.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.title.poster_url} alt="" style={{ width: 28, aspectRatio: "2/3", objectFit: "cover", borderRadius: 4 }} />
              ) : (
                <span style={{ width: 28, aspectRatio: "2/3", background: "var(--panel)", borderRadius: 4, flex: "none" }} />
              )}
              <div className="col" style={{ gap: 3, minWidth: 0 }}>
                <b style={{ color: "var(--bright)", fontSize: 13.5 }}>{item.title?.name ?? item.display_name}</b>
                <input
                  className="input"
                  defaultValue={item.note}
                  placeholder="note — e.g. in the queue · this week · S3 E4/8"
                  style={{ padding: "3px 8px", fontSize: 11 }}
                  onBlur={(e) => editNote(item.id, e.target.value)}
                />
              </div>
            </div>
            <span className="row" style={{ flex: "none" }}>
              <button className="chip" style={{ cursor: "pointer", background: "none" }} disabled={i === 0} onClick={() => move(item.id, -1)}>↑</button>
              <button className="chip" style={{ cursor: "pointer", background: "none" }} disabled={i === items.length - 1} onClick={() => move(item.id, 1)}>↓</button>
              <button className="chip" style={{ cursor: "pointer", background: "none", color: "var(--pink)" }} onClick={() => remove(item.id)}>✕</button>
            </span>
          </div>
        ))}
      </div>

      <section className="gl col" style={{ padding: 14, gap: 8 }}>
        <span className="label" style={{ fontSize: 10 }}>Add to the rail</span>
        <select className="input" value={titleId} onChange={(e) => setTitleId(e.target.value)}>
          <option value="">— free text (not in library) —</option>
          {library.titles.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.year ? `(${t.year})` : ""}
            </option>
          ))}
        </select>
        {!titleId && (
          <input className="input" placeholder="name to show" value={freeText} onChange={(e) => setFreeText(e.target.value)} />
        )}
        <input className="input" placeholder="note — e.g. this week" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn--amber" style={{ alignSelf: "flex-start" }} onClick={add} disabled={!titleId && !freeText.trim()}>
          add
        </button>
      </section>
    </div>
  );
}

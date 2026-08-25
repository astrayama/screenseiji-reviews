"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type Subscriber = { id: string; email: string; subscribed_at: string; unsubscribed_at: string | null };

export function AudiencePanel() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [subject, setSubject] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { subscribers } = await api<{ subscribers: Subscriber[] }>("/api/desk/subscribers");
    setSubs(subscribers);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const active = subs.filter((s) => !s.unsubscribed_at);

  async function send() {
    if (!confirm(`Send this dispatch to ${active.length} subscriber${active.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await api<{ sent: number; failed: string | null }>("/api/desk/dispatch", {
        method: "POST",
        json: { subject, markdown },
      });
      setStatus(`sent to ${res.sent} ✦${res.failed ? ` (some failed: ${res.failed})` : ""}`);
      setSubject("");
      setMarkdown("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "sending failed");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const rows = ["email,subscribed_at", ...active.map((s) => `${s.email},${s.subscribed_at}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dispatches-subscribers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="desk-grid">
      <section className="col" style={{ gap: 10 }}>
        <span className="label">Send a dispatch</span>
        <input className="input" placeholder="subject — e.g. Starfall: Ember, reviewed" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea
          className="input"
          rows={10}
          placeholder={"markdown body…\n\nThe verdict, a link, whatever the dispatch needs.\nAn unsubscribe link is added automatically."}
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
        />
        <div className="row">
          <button className="btn btn--amber" onClick={send} disabled={busy || !subject.trim() || !markdown.trim() || active.length === 0}>
            {busy ? "sending…" : `Send to ${active.length}`}
          </button>
          {status && <span className="mono-note" style={{ color: status.includes("✦") ? "var(--amber)" : "var(--pink)" }}>{status}</span>}
        </div>
        <p className="mono-note" style={{ margin: 0, fontSize: 10.5 }}>
          needs RESEND_API_KEY + NEWSLETTER_FROM configured · every email gets its own unsubscribe link
        </p>
      </section>

      <aside className="gl col" style={{ padding: 12, gap: 8 }}>
        <div className="row between">
          <span className="label" style={{ fontSize: 10 }}>Subscribers — {active.length} active</span>
          <button className="chip" style={{ cursor: "pointer", background: "none" }} onClick={exportCsv} disabled={!active.length}>
            export csv
          </button>
        </div>
        {subs.length === 0 && <span className="mono-note" style={{ fontSize: 10.5 }}>nobody yet — the Join form feeds this list</span>}
        {subs.slice(0, 40).map((s) => (
          <div className="row between" key={s.id}>
            <span
              className="mono-note"
              style={{
                fontSize: 11,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textDecoration: s.unsubscribed_at ? "line-through" : "none",
                opacity: s.unsubscribed_at ? 0.5 : 1,
              }}
            >
              {s.email}
            </span>
            <button
              className="chip"
              style={{ cursor: "pointer", background: "none", color: "var(--pink)", flex: "none", fontSize: 9 }}
              onClick={async () => {
                if (!confirm(`Remove ${s.email} entirely?`)) return;
                await api(`/api/desk/subscribers?id=${s.id}`, { method: "DELETE" });
                await load();
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </aside>
    </div>
  );
}

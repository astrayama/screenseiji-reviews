"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

const FIELDS: { key: string; label: string; kind: "input" | "textarea"; hint?: string }[] = [
  { key: "critic_name", label: "Critic name", kind: "input", hint: "defaults to “The Sage”" },
  { key: "bio", label: "Bio (markdown)", kind: "textarea", hint: "shown on About, next to the abstract mark" },
  { key: "how_i_score", label: "How I score (markdown)", kind: "textarea", hint: "the trust + SEO section explaining sub-scores" },
  { key: "established", label: "Established (year)", kind: "input" },
  { key: "motto", label: "Motto chip", kind: "input", hint: "defaults to “no algorithms, one voice”" },
  { key: "contact_email", label: "Contact email (for editors)", kind: "input" },
  { key: "press_kit_url", label: "Press kit URL", kind: "input", hint: "link to a PDF or folder" },
  { key: "bluesky_url", label: "Bluesky URL", kind: "input" },
  { key: "youtube_url", label: "YouTube URL", kind: "input" },
];

export function SettingsPanel() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ config: Record<string, string> }>("/api/desk/settings").then(({ config }) => {
      setValues(Object.fromEntries(FIELDS.map((f) => [f.key, config[f.key] ?? ""])));
      setLoaded(true);
    });
  }, []);

  async function save() {
    setStatus("");
    await api("/api/desk/settings", { method: "PUT", json: values });
    setStatus("saved ✦");
  }

  if (!loaded) return <p className="mono-note">loading…</p>;

  return (
    <div className="col" style={{ gap: 14, maxWidth: 560 }}>
      <span className="label">About page &amp; site identity</span>
      {FIELDS.map((f) => (
        <div className="col" style={{ gap: 4 }} key={f.key}>
          <span className="label" style={{ fontSize: 10 }}>{f.label}</span>
          {f.kind === "input" ? (
            <input className="input" value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
          ) : (
            <textarea className="input" rows={4} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
          )}
          {f.hint && <span className="mono-note" style={{ fontSize: 10 }}>{f.hint}</span>}
        </div>
      ))}
      <div className="row">
        <button className="btn btn--amber" onClick={save}>save settings</button>
        {status && <span className="mono-note" style={{ color: "var(--amber)" }}>{status}</span>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

const FIELDS: { key: string; label: string; kind: "input" | "textarea"; hint?: string }[] = [
  { key: "critic_name", label: "Critic name", kind: "input", hint: "defaults to “The Sage”" },
  { key: "tagline", label: "Tagline", kind: "input", hint: "one line under your name on About — also becomes the site's meta description" },
  { key: "bio", label: "Bio (markdown)", kind: "textarea", hint: "shown on About, next to your photo" },
  { key: "how_i_score", label: "How I score (markdown)", kind: "textarea", hint: "the trust + SEO section explaining sub-scores" },
  { key: "established", label: "Established (year)", kind: "input" },
  { key: "motto", label: "Motto chip", kind: "input", hint: "defaults to “no algorithms, one voice”" },
  { key: "contact_email", label: "Contact email (for editors)", kind: "input" },
  { key: "press_kit_url", label: "Press kit URL", kind: "input", hint: "link to a PDF or folder" },
  { key: "instagram_url", label: "Instagram URL", kind: "input" },
  { key: "tiktok_url", label: "TikTok URL", kind: "input" },
  { key: "youtube_url", label: "YouTube URL", kind: "input" },
];

export function SettingsPanel() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ config: Record<string, string> }>("/api/desk/settings").then(({ config }) => {
      setValues(Object.fromEntries(FIELDS.map((f) => [f.key, config[f.key] ?? ""])));
      setPhotoUrl(config.photo_url ?? "");
      setLoaded(true);
    });
  }, []);

  async function save() {
    setStatus("");
    try {
      await api("/api/desk/settings", { method: "PUT", json: values });
      setStatus("saved ✦");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "save failed");
    }
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    setStatus("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/desk/upload-photo", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "upload failed");
      setPhotoUrl(body.url);
      setStatus("photo updated ✦");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "upload failed");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setStatus("");
    try {
      await api("/api/desk/settings", { method: "PUT", json: { photo_url: "" } });
      setPhotoUrl("");
      setStatus("back to the abstract mark ✦");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "couldn't remove the photo");
    }
  }

  if (!loaded) return <p className="mono-note">loading…</p>;

  return (
    <div className="col" style={{ gap: 14, maxWidth: 560 }}>
      <span className="label">About page &amp; site identity</span>

      {/* photo */}
      <div className="gl row" style={{ padding: 14, gap: 14, alignItems: "center" }}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Critic photo"
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--amber)", flex: "none" }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 64, height: 64, borderRadius: "50%", flex: "none",
              background: "linear-gradient(140deg, #4a3f7e, #8a6a7e)",
              border: "1.5px solid var(--amber)",
            }}
          />
        )}
        <div className="col" style={{ gap: 6 }}>
          <span className="label" style={{ fontSize: 10 }}>Photo</span>
          <div className="row">
            <label className="chip chip--solid" style={{ cursor: "pointer" }}>
              {photoBusy ? "uploading…" : photoUrl ? "replace" : "upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f);
                }}
              />
            </label>
            {photoUrl && (
              <button className="chip" style={{ cursor: "pointer", background: "none" }} onClick={removePhoto}>
                remove
              </button>
            )}
          </div>
          <span className="mono-note" style={{ fontSize: 10 }}>
            shows on About in place of the abstract mark · JPEG/PNG/WebP, under 5MB
          </span>
        </div>
      </div>

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

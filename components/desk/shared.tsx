"use client";

import { useState } from "react";

export function Poster({ url, w }: { url: string | null; w: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={{ width: w, aspectRatio: "2/3", objectFit: "cover", borderRadius: 4, flex: "none" }} />
  ) : (
    <span style={{ width: w, aspectRatio: "2/3", borderRadius: 4, background: "var(--panel)", flex: "none" }} />
  );
}

export function UploadPoster({ titleId, onDone }: { titleId: string; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <label className="chip" style={{ cursor: "pointer" }}>
      {busy ? "uploading…" : error ? error : "poster"}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError("");
          const form = new FormData();
          form.append("file", file);
          form.append("title_id", titleId);
          const res = await fetch("/api/desk/upload-poster", { method: "POST", body: form });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setError(body.error ?? "upload failed");
          }
          await onDone();
          setBusy(false);
        }}
      />
    </label>
  );
}

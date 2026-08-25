"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeskLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/desk/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/desk");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "that's not the word");
      setBusy(false);
    }
  }

  return (
    <div className="wrap col" style={{ maxWidth: 380, paddingTop: 70, gap: 18, textAlign: "center" }}>
      <span className="label label--amber" style={{ letterSpacing: 3 }}>▣ Sage Desk — private</span>
      <h1 className="ttl" style={{ fontSize: 28 }}>Speak the word.</h1>
      <form className="col" style={{ gap: 10 }} onSubmit={submit}>
        <input
          className="input"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          aria-label="Desk password"
        />
        <button className="btn btn--amber" style={{ justifyContent: "center" }} disabled={busy || !password}>
          {busy ? "…" : "Enter the desk"}
        </button>
        {error && <span className="mono-note" style={{ color: "var(--pink)" }}>{error}</span>}
      </form>
    </div>
  );
}

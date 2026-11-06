"use client";

import { useState } from "react";

/* "Dispatches from the seeker" — join form, appears on home + review footers */
export function NewsletterBar() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setState("busy");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "something went sideways");
      setState("done");
      setMessage(body.message ?? "you're in — dispatches incoming");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "something went sideways");
    }
  }

  return (
    <div
      className="gl row between"
      style={{ padding: "24px 30px", flexWrap: "wrap", gap: 18, background: "var(--panel-2)", borderColor: "#2c2739" }}
    >
      <div className="row" style={{ gap: 18 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2.5c.6 4.8 2.7 6.9 9.5 9.5-6.8 2.6-8.9 4.7-9.5 9.5-.6-4.8-2.7-6.9-9.5-9.5 6.8-2.6 8.9-4.7 9.5-9.5Z" />
        </svg>
        <div className="ttl" style={{ fontSize: 22 }}>
          Dispatches from the seeker
        </div>
      </div>
      {state === "done" ? (
        <span className="mono-note" style={{ color: "var(--amber)" }}>✦ {message}</span>
      ) : (
        <form className="row" onSubmit={join} style={{ gap: 12, flexWrap: "wrap" }}>
          <input
            className="input"
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: 240, borderRadius: 999, padding: "12px 20px", background: "var(--bg)" }}
            aria-label="Email address"
          />
          <button className="btn btn--amber" disabled={state === "busy"}>
            {state === "busy" ? "…" : "Join"}
          </button>
          {state === "error" && (
            <span className="mono-note" style={{ color: "var(--pink)" }}>{message}</span>
          )}
        </form>
      )}
    </div>
  );
}

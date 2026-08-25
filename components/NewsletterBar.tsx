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
    <div className="gl row between" style={{ padding: "14px 18px", flexWrap: "wrap", gap: 12 }}>
      <div className="ttl" style={{ fontSize: 19 }}>
        Dispatches from the seeker
      </div>
      {state === "done" ? (
        <span className="mono-note" style={{ color: "var(--amber)" }}>✦ {message}</span>
      ) : (
        <form className="row" onSubmit={join}>
          <input
            className="input"
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: 190, borderRadius: 999, padding: "7px 14px" }}
            aria-label="Email address"
          />
          <button className="chip chip--solid" style={{ cursor: "pointer" }} disabled={state === "busy"}>
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

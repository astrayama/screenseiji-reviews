"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* Counts one view per path per browser session — powers the Desk stats. */
export function ViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/desk")) return;
    const key = `sage-viewed:${pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode — count anyway */
    }
    const payload = new Blob([JSON.stringify({ path: pathname })], { type: "application/json" });
    const sent = navigator.sendBeacon?.("/api/views", payload);
    if (!sent) {
      fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);
  return null;
}

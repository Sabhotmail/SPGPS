"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const INTERVAL_MS = 40_000;

async function sendHeartbeat(path: string) {
  try {
    await fetch("/api/presence/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    });
  } catch {
    /* ignore network errors */
  }
}

export function PresenceHeartbeat() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const beat = () => {
      if (document.visibilityState === "hidden") return;
      void sendHeartbeat(pathRef.current || "/");
    };

    const start = () => {
      beat();
      if (timer) clearInterval(timer);
      timer = setInterval(beat, INTERVAL_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        start();
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (document.visibilityState === "hidden") return;
    void sendHeartbeat(pathname || "/");
  }, [pathname]);

  return null;
}

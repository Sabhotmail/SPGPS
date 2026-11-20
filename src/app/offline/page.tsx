"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_0%,color-mix(in_oklch,var(--brand)_14%,transparent),transparent_60%)]"
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-5">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
          <WifiOff className="size-7" aria-hidden />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            SPGPS
          </p>
          <h1 className="font-brand text-2xl font-semibold tracking-tight text-foreground">
            ไม่มีการเชื่อมต่อเครือข่าย
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            SiriPro GPS ต้องใช้อินเทอร์เน็ตเพื่อแสดงแผนที่และตำแหน่งอุปกรณ์
            โปรดเชื่อมต่อเครือข่ายแล้วลองอีกครั้ง
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          ลองอีกครั้ง
        </button>
      </div>
    </main>
  );
}

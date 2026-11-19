"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, RefreshCw, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PinPayload = {
  code: string;
  periodSeconds: number;
  remainingSeconds: number;
};

export default function AdminMobilePage() {
  const [pin, setPin] = useState<PinPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/mobile-pin", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setPin(null);
        setError(data.error ?? "โหลดรหัสไม่สำเร็จ");
        return;
      }
      setPin(data);
      setRemaining(data.remainingSeconds ?? 0);
    } catch {
      setPin(null);
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pin) return;

    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          void load();
          return pin.periodSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [pin, load]);

  const progress =
    pin && pin.periodSeconds > 0
      ? Math.max(0, Math.min(1, remaining / pin.periodSeconds))
      : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <PageHeader
        title="แอพมือถือ"
        description="รหัสนี้ใช้ปลดล็อกหน้าตั้งค่า IP/URL ในแอพ Android SPGPS (เปลี่ยนทุก 30 วินาที)"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              className={cn("size-4", loading && "animate-spin")}
            />
            รีเฟรช
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="size-4 text-primary" />
            รหัสปลดล็อกตั้งค่า
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <p
                className="font-mono text-4xl font-semibold tracking-[0.35em] text-foreground sm:text-5xl"
                aria-live="polite"
              >
                {loading && !pin ? "······" : pin?.code ?? "······"}
              </p>
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>หมดอายุใน</span>
                  <span className="font-mono tabular-nums">{remaining}s</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-border/60 p-5 text-sm leading-relaxed text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
            <Smartphone className="size-4 text-primary" />
            วิธีใช้
          </div>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>เปิดแอพ SPGPS บน Android</li>
            <li>แตะเมนูตั้งค่า (ครั้งแรกหลังติดตั้งไม่ต้องใส่รหัส)</li>
            <li>ใส่รหัส 6 หลักด้านบนเพื่อเข้าหน้าตั้งค่า IP/URL</li>
            <li>บันทึกที่อยู่เซิร์ฟเวอร์ เช่น http://192.168.1.10:3000</li>
          </ol>
          <p className="mt-3 text-xs">
            รหัสถูกสร้างจาก{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              MOBILE_SETTINGS_TOTP_SECRET
            </code>{" "}
            ต้องตรงกับค่าในแอพ Android
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio, RefreshCw, Shield, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/types";
import { cn } from "@/lib/utils";

type OnlineUser = {
  id: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  lastSeenAt: string;
  path: string | null;
};

const REFRESH_MS = 15_000;

function formatRelative(iso: string): string {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 15) return "เมื่อสักครู่";
  if (sec < 60) return `${sec} วินาทีที่แล้ว`;
  const min = Math.floor(sec / 60);
  return `${min} นาทีที่แล้ว`;
}

export default function AdminOnlinePage() {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/online");
      if (!res.ok) {
        setError(res.status === 403 ? "ไม่มีสิทธิ์เข้าถึง" : "โหลดไม่สำเร็จ");
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      setCount(data.count ?? 0);
      setError("");
      setUpdatedAt(new Date());
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Online Users"
        description="ผู้ใช้ที่มีกิจกรรมในช่วง 2 นาทีที่ผ่านมา (heartbeat จากเว็บ)"
        meta={
          <Badge
            variant="secondary"
            className="rounded-lg px-2.5 py-0.5 text-[11px] font-semibold tabular-nums"
          >
            {count} ออนไลน์
          </Badge>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            รีเฟรช
          </Button>
        }
      />

      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {updatedAt && (
        <p className="mb-4 text-[12px] text-muted-foreground">
          อัปเดตล่าสุด {formatDateTime(updatedAt.toISOString())} · รีเฟรชอัตโนมัติทุก 15 วินาที
        </p>
      )}

      <div className="overflow-x-auto rounded-[1.35rem] border border-border/60 bg-card/80 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)]">
        <table className="workspace-table">
          <thead>
            <tr>
              <th>ผู้ใช้</th>
              <th>บทบาท</th>
              <th>หน้าล่าสุด</th>
              <th>ใช้งานล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-10 text-center text-[13px] text-muted-foreground"
                >
                  กำลังโหลด…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-2xl bg-accent text-primary">
                    <Radio className="size-5" aria-hidden />
                  </span>
                  ไม่มีผู้ใช้ออนไลน์
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-status-online/15 text-status-online">
                        <span className="size-2 animate-pulse rounded-full bg-status-online" />
                      </span>
                      <span className="text-[13px] font-medium">{u.email}</span>
                    </div>
                  </td>
                  <td>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "gap-1 rounded-lg text-[11px] font-semibold",
                        u.role === "ADMIN"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {u.role === "ADMIN" ? (
                        <Shield className="size-3" />
                      ) : (
                        <UserRound className="size-3" />
                      )}
                      {u.role}
                    </Badge>
                  </td>
                  <td className="max-w-[200px] truncate font-mono text-[12px] text-muted-foreground">
                    {u.path ?? "—"}
                  </td>
                  <td>
                    <div className="text-[13px]">{formatRelative(u.lastSeenAt)}</div>
                    <div className="text-[11px] tabular-nums text-muted-foreground">
                      {formatDateTime(u.lastSeenAt)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

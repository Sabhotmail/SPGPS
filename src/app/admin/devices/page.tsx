"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Battery,
  History,
  RefreshCw,
  Search,
  Smartphone,
  X,
} from "lucide-react";
import { daysAgoYmdInAppTz, todayYmdInAppTz } from "@/lib/app-timezone";
import { formatBattery, formatDateTime } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Device = {
  id: string;
  scalefusionDeviceId: string;
  deviceName: string;
  employeeName: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
  make: string | null;
  model: string | null;
  osVersion: string | null;
  connectionStatus: string | null;
  batteryPercent: number | null;
  batteryCharging: boolean | null;
  batteryHealth: string | null;
  phoneNo: string | null;
  simNetwork: string | null;
  sfGroupName: string | null;
  licenseActive: boolean | null;
  licenseExpiresAt: string | null;
  detailsFetchedAt: string | null;
  groups: { id: string; name: string }[];
};

type SyncLog = {
  id: string;
  syncType: string;
  status: string;
  recordsAdded: number;
  errorMessage: string | null;
  createdAt: string;
};

const SYNC_TYPE_LABEL: Record<string, string> = {
  DEVICE_SYNC: "Sync อุปกรณ์",
  LOCATION_POLL: "Poll ตำแหน่ง",
  HISTORY_BACKFILL: "Backfill ประวัติ",
};

const PAGE_SIZE = 20;

function syncTypeLabel(syncType: string) {
  return SYNC_TYPE_LABEL[syncType] ?? syncType;
}

function connectionTone(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("online") || s.includes("connected")) {
    return "bg-status-online/15 text-status-online";
  }
  if (s.includes("offline") || s.includes("disconnected")) {
    return "bg-muted text-muted-foreground";
  }
  return "bg-muted text-muted-foreground";
}

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [pullingId, setPullingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [pullTarget, setPullTarget] = useState<Device | null>(null);
  const [pullDate, setPullDate] = useState(todayYmdInAppTz);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "on" | "off">("all");

  async function load() {
    const [devicesRes, logsRes] = await Promise.all([
      fetch("/api/admin/devices"),
      fetch("/api/admin/sync-logs"),
    ]);
    if (devicesRes.ok) {
      const data = await devicesRes.json();
      setDevices(data.devices ?? []);
    }
    if (logsRes.ok) {
      const data = await logsRes.json();
      setLogs(data.logs ?? []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function syncDevices() {
    setSyncing(true);
    setMessage("");
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "devices" }),
    });
    setSyncing(false);
    if (res.ok) {
      const data = await res.json();
      setMessage(
        `Sync แล้ว ${data.synced} อุปกรณ์ (${data.created} ใหม่` +
          (data.detailsUpdated != null
            ? `, รายละเอียด ${data.detailsUpdated}`
            : "") +
          `)`
      );
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Sync ล้มเหลว");
    }
  }

  async function pollNow() {
    setSyncing(true);
    setMessage("");
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "poll" }),
    });
    setSyncing(false);
    if (res.ok) {
      const data = await res.json();
      setMessage(`Poll แล้ว ${data.recordsAdded} records`);
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Poll ล้มเหลว");
    }
  }

  async function backfillRecent() {
    if (
      !confirm(
        "ดึงประวัติย้อนหลัง 1 วันจาก Scalefusion?\n\nเต็ม ~30 วันใช้คำสั่ง:\nnpm run worker:backfill"
      )
    ) {
      return;
    }
    setSyncing(true);
    setMessage("กำลัง backfill... อาจใช้เวลาหลายนาที");
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "backfill", days: 1 }),
    });
    setSyncing(false);
    if (res.ok) {
      const data = await res.json();
      setMessage(
        `Backfill แล้ว +${data.recordsAdded} records · API ${data.requestsMade} ครั้ง` +
          (data.note ? ` · ${data.note}` : "")
      );
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Backfill ล้มเหลว");
    }
  }

  async function pullDevice(device: Device, date: string) {
    setPullingId(device.id);
    setMessage("");
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "device-poll",
        deviceId: device.id,
        date,
      }),
    });
    setPullingId(null);
    if (res.ok) {
      const data = await res.json();
      setMessage(
        `ดึง ${data.deviceName}: +${data.recordsAdded} จุดใหม่ (API ${data.apiCount} จุด · ${data.date})`
      );
      setPullTarget(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(
        typeof data.error === "string" ? data.error : "ดึงพิกัดล้มเหลว"
      );
    }
  }

  function openPullDialog(device: Device) {
    setPullDate(todayYmdInAppTz());
    setPullTarget(device);
    setMessage("");
  }

  async function refreshDetails(device: Device) {
    setPullingId(device.id);
    setMessage("");
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "device-details", deviceId: device.id }),
    });
    setPullingId(null);
    if (res.ok) {
      setMessage(`อัปเดตรายละเอียด ${device.deviceName} แล้ว`);
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "อัปเดตรายละเอียดล้มเหลว");
    }
  }

  async function updateDevice(
    id: string,
    data: { employeeName?: string; isActive?: boolean }
  ) {
    await fetch(`/api/admin/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  const activeCount = devices.filter((d) => d.isActive).length;
  const inactiveCount = devices.length - activeCount;
  const lowBatteryCount = devices.filter(
    (d) => d.batteryPercent != null && d.batteryPercent <= 15
  ).length;
  const busy = syncing || pullingId != null;

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      const matchActive =
        filterActive === "all" ||
        (filterActive === "on" && d.isActive) ||
        (filterActive === "off" && !d.isActive);
      if (!matchActive) return false;
      if (!q) return true;
      return (
        d.deviceName.toLowerCase().includes(q) ||
        (d.employeeName ?? "").toLowerCase().includes(q) ||
        d.scalefusionDeviceId.toLowerCase().includes(q) ||
        (d.sfGroupName ?? "").toLowerCase().includes(q) ||
        d.groups.some((g) => g.name.toLowerCase().includes(q))
      );
    });
  }, [devices, search, filterActive]);

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageDevices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDevices.slice(start, start + PAGE_SIZE);
  }, [filteredDevices, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, filterActive]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rangeStart =
    filteredDevices.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredDevices.length);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Fleet inventory"
        title="อุปกรณ์"
        description="Sync จาก Scalefusion ตั้งชื่อพนักงาน และดึงพิกัดแยกตามอุปกรณ์"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              onClick={syncDevices}
              disabled={busy}
              className="h-10 w-full cursor-pointer gap-1.5 rounded-xl text-[13px] sm:h-9 sm:w-auto"
            >
              <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
              Sync Scalefusion
            </Button>
            <Button
              variant="outline"
              onClick={pollNow}
              disabled={busy}
              className="h-10 w-full cursor-pointer rounded-xl text-[13px] sm:h-9 sm:w-auto"
            >
              Poll ทั้งหมด
            </Button>
            <Button
              variant="outline"
              onClick={backfillRecent}
              disabled={busy}
              className="h-10 w-full cursor-pointer gap-1.5 rounded-xl text-[13px] sm:h-9 sm:w-auto"
            >
              <History className="size-3.5" />
              Backfill 1 วัน
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            ทั้งหมด
          </p>
          <p className="mt-2 flex items-center gap-2 font-brand text-2xl font-semibold tabular-nums">
            <Smartphone className="size-5 text-primary" />
            {devices.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            ติดตาม
          </p>
          <p className="mt-2 font-brand text-2xl font-semibold tabular-nums text-status-online">
            {activeCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            ปิดติดตาม
          </p>
          <p className="mt-2 font-brand text-2xl font-semibold tabular-nums">
            {inactiveCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            แบตต่ำ
          </p>
          <p
            className={cn(
              "mt-2 flex items-center gap-2 font-brand text-2xl font-semibold tabular-nums",
              lowBatteryCount > 0 ? "text-destructive" : "text-foreground"
            )}
          >
            <Battery className="size-5" />
            {lowBatteryCount}
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-[13px] text-foreground">
          {message}
        </div>
      )}

      {pullTarget && (
        <div className="mb-5 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Pull locations
              </p>
              <p className="mt-1 text-[15px] font-semibold tracking-tight">
                {pullTarget.employeeName ?? pullTarget.deviceName}
              </p>
              <p className="truncate text-[12px] text-muted-foreground">
                {pullTarget.deviceName}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer rounded-full"
              disabled={pullingId != null}
              onClick={() => setPullTarget(null)}
              aria-label="ปิด"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-1 sm:w-auto">
              <label
                htmlFor="pull-date"
                className="block text-[12px] text-muted-foreground"
              >
                วันที่ต้องการ sync
              </label>
              <Input
                id="pull-date"
                type="date"
                value={pullDate}
                min={daysAgoYmdInAppTz(30)}
                max={todayYmdInAppTz()}
                onChange={(e) => setPullDate(e.target.value)}
                className="h-10 w-full rounded-xl sm:w-[180px]"
                autoFocus
              />
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 cursor-pointer rounded-xl sm:flex-none"
                disabled={pullingId != null}
                onClick={() => setPullTarget(null)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 cursor-pointer rounded-xl sm:flex-none"
                disabled={!pullDate || pullingId != null}
                onClick={() => pullDevice(pullTarget, pullDate)}
              >
                {pullingId === pullTarget.id ? "กำลังดึง..." : "ดึงพิกัด"}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Scalefusion เก็บประวัติประมาณ 30 วันล่าสุด
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ อุปกรณ์ กลุ่ม หรือ SF ID"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <div className="flex w-full rounded-2xl bg-muted/70 p-1 sm:w-auto">
          {(
            [
              ["all", "ทั้งหมด"],
              ["on", "ติดตาม"],
              ["off", "ปิด"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterActive(value)}
              className={cn(
                "h-8 flex-1 cursor-pointer rounded-xl px-3 text-[12px] font-medium transition-colors sm:flex-none",
                filterActive === value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile device cards */}
      <div className="space-y-3 md:hidden">
        {pageDevices.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-card/40 px-5 py-12 text-center text-[13px] text-muted-foreground">
            {devices.length === 0
              ? "ยังไม่มีอุปกรณ์ — กด Sync Scalefusion"
              : "ไม่พบผลลัพธ์ตามตัวกรอง"}
          </div>
        ) : (
          pageDevices.map((d) => (
            <section
              key={d.id}
              className="rounded-[1.35rem] border border-border/60 bg-card/80 p-4 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.3)]"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-brand text-[1.02rem] font-semibold tracking-tight">
                    {d.deviceName}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    SF {d.scalefusionDeviceId}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium",
                    connectionTone(d.connectionStatus)
                  )}
                >
                  {d.connectionStatus ?? "—"}
                </span>
              </div>

              <div className="mb-3 space-y-1.5">
                <label className="text-[11px] text-muted-foreground">
                  ชื่อพนักงาน
                </label>
                <Input
                  defaultValue={d.employeeName ?? ""}
                  onBlur={(e) =>
                    updateDevice(d.id, { employeeName: e.target.value })
                  }
                  className="h-10 rounded-xl text-[13px]"
                  placeholder="ชื่อพนักงาน"
                />
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl bg-muted/40 px-2.5 py-2">
                  <p className="text-[10px] text-muted-foreground">แบต</p>
                  <p
                    className={cn(
                      "mt-0.5 tabular-nums",
                      (d.batteryPercent ?? 100) <= 15
                        ? "font-semibold text-destructive"
                        : "text-foreground"
                    )}
                  >
                    {formatBattery(d.batteryPercent, d.batteryCharging) ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 px-2.5 py-2">
                  <p className="text-[10px] text-muted-foreground">Last seen</p>
                  <p className="mt-0.5 tabular-nums text-foreground">
                    {d.lastSeenAt ? formatDateTime(d.lastSeenAt) : "—"}
                  </p>
                </div>
              </div>

              {(d.groups.length > 0 || d.sfGroupName) && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {d.groups.map((g) => (
                    <Badge
                      key={g.id}
                      variant="outline"
                      className="rounded-md font-normal"
                    >
                      {g.name}
                    </Badge>
                  ))}
                  {d.sfGroupName && d.groups.length === 0 && (
                    <span className="text-[12px] text-muted-foreground">
                      {d.sfGroupName}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
                <Button
                  variant={d.isActive ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 flex-1 cursor-pointer rounded-xl text-[12px]",
                    d.isActive &&
                      "bg-status-online/15 text-status-online hover:bg-status-online/20"
                  )}
                  disabled={busy}
                  onClick={() => updateDevice(d.id, { isActive: !d.isActive })}
                >
                  {d.isActive ? "ติดตาม: เปิด" : "ติดตาม: ปิด"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 flex-1 cursor-pointer rounded-xl text-[12px]"
                  disabled={busy || !d.isActive}
                  onClick={() => openPullDialog(d)}
                >
                  {pullingId === d.id ? "..." : "ดึงพิกัด"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 flex-1 cursor-pointer rounded-xl text-[12px]"
                  disabled={busy}
                  onClick={() => refreshDetails(d)}
                >
                  รายละเอียด
                </Button>
              </div>
            </section>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-[1.35rem] border border-border/60 bg-card/80 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] md:block">
        <table className="workspace-table">
          <thead>
            <tr>
              <th>อุปกรณ์</th>
              <th>พนักงาน</th>
              <th>สถานะ</th>
              <th>แบต</th>
              <th>รุ่น</th>
              <th>Last seen</th>
              <th>กลุ่ม</th>
              <th>ติดตาม</th>
              <th>การทำงาน</th>
            </tr>
          </thead>
          <tbody>
            {pageDevices.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-10 text-center text-[13px] text-muted-foreground"
                >
                  {devices.length === 0
                    ? "ยังไม่มีอุปกรณ์ — กด Sync Scalefusion"
                    : "ไม่พบผลลัพธ์ตามตัวกรอง"}
                </td>
              </tr>
            ) : (
              pageDevices.map((d) => (
                <tr key={d.id}>
                  <td className="text-[13px]">
                    <div className="font-medium tracking-tight">
                      {d.deviceName}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      SF {d.scalefusionDeviceId}
                    </div>
                    {d.sfGroupName && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {d.sfGroupName}
                      </div>
                    )}
                  </td>
                  <td>
                    <Input
                      defaultValue={d.employeeName ?? ""}
                      onBlur={(e) =>
                        updateDevice(d.id, { employeeName: e.target.value })
                      }
                      className="h-9 max-w-[180px] rounded-xl text-[13px]"
                      placeholder="ชื่อพนักงาน"
                    />
                  </td>
                  <td>
                    <span
                      className={cn(
                        "inline-flex rounded-lg px-2 py-1 text-[11px] font-medium",
                        connectionTone(d.connectionStatus)
                      )}
                    >
                      {d.connectionStatus ?? "—"}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "text-[12px] tabular-nums",
                      (d.batteryPercent ?? 100) <= 15
                        ? "font-semibold text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatBattery(d.batteryPercent, d.batteryCharging) ?? "—"}
                  </td>
                  <td className="text-[12px] text-muted-foreground">
                    {[d.make, d.model].filter(Boolean).join(" ") || "—"}
                    {d.osVersion ? (
                      <div className="text-[11px]">Android {d.osVersion}</div>
                    ) : null}
                  </td>
                  <td className="text-[12px] tabular-nums text-muted-foreground">
                    {d.lastSeenAt ? formatDateTime(d.lastSeenAt) : "—"}
                  </td>
                  <td className="text-[12px] text-muted-foreground">
                    {d.groups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {d.groups.map((g) => (
                          <Badge
                            key={g.id}
                            variant="outline"
                            className="rounded-md font-normal"
                          >
                            {g.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <Button
                      variant={d.isActive ? "secondary" : "outline"}
                      size="sm"
                      className={cn(
                        "h-8 cursor-pointer rounded-xl text-[12px]",
                        d.isActive &&
                          "bg-status-online/15 text-status-online hover:bg-status-online/20"
                      )}
                      disabled={busy}
                      onClick={() =>
                        updateDevice(d.id, { isActive: !d.isActive })
                      }
                    >
                      {d.isActive ? "เปิด" : "ปิด"}
                    </Button>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 cursor-pointer rounded-xl text-[12px]"
                        disabled={busy || !d.isActive}
                        onClick={() => openPullDialog(d)}
                        title={
                          d.isActive
                            ? "เลือกวันแล้วดึงพิกัดจาก Scalefusion"
                            : "เปิดการติดตามก่อน"
                        }
                      >
                        {pullingId === d.id ? "..." : "พิกัด"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 cursor-pointer rounded-xl text-[12px]"
                        disabled={busy}
                        onClick={() => refreshDetails(d)}
                        title="ดึงรายละเอียดเครื่องจาก Scalefusion v3"
                      >
                        รายละเอียด
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredDevices.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] tabular-nums text-muted-foreground">
            แสดง {rangeStart}–{rangeEnd} จาก {filteredDevices.length}
            {filteredDevices.length !== devices.length
              ? ` (กรองจาก ${devices.length})`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer rounded-xl text-[12px]"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ก่อนหน้า
            </Button>
            <span className="text-[12px] tabular-nums text-muted-foreground">
              หน้า {currentPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer rounded-xl text-[12px]"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}

      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Activity
            </p>
            <h2 className="mt-1 font-brand text-[1.15rem] font-semibold tracking-tight">
              Sync logs
            </h2>
          </div>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            {logs.length} รายการล่าสุด
          </span>
        </div>
        <div className="max-h-[min(50vh,420px)] overflow-y-auto overflow-x-auto rounded-[1.35rem] border border-border/60 bg-card/80 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)]">
          <table className="workspace-table">
            <thead className="sticky top-0 z-10 [&_th]:bg-muted/80 [&_th]:backdrop-blur-sm">
              <tr>
                <th>เวลา</th>
                <th>ประเภท</th>
                <th>สถานะ</th>
                <th>Records</th>
                <th>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-[13px] text-muted-foreground"
                  >
                    ยังไม่มี log
                  </td>
                </tr>
              ) : (
                logs.map((l) => {
                  const failed = l.status === "FAILURE";
                  return (
                    <tr key={l.id}>
                      <td className="text-[12px] tabular-nums text-muted-foreground">
                        {formatDateTime(l.createdAt)}
                      </td>
                      <td className="text-[12px]">
                        <span title={l.syncType}>
                          {syncTypeLabel(l.syncType)}
                        </span>
                      </td>
                      <td className="text-[12px]">
                        <span
                          className={cn(
                            "inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium",
                            failed
                              ? "bg-destructive/10 text-destructive"
                              : "bg-status-online/15 text-status-online"
                          )}
                        >
                          {failed ? "ล้มเหลว" : "สำเร็จ"}
                        </span>
                      </td>
                      <td className="tabular-nums">{l.recordsAdded}</td>
                      <td
                        className={
                          failed
                            ? "text-[12px] text-destructive"
                            : "text-[12px] text-muted-foreground"
                        }
                      >
                        {l.errorMessage ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

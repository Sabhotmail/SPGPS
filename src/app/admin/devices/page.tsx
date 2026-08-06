"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBattery, formatDateTime } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoYmd(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function syncTypeLabel(syncType: string) {
  return SYNC_TYPE_LABEL[syncType] ?? syncType;
}

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [pullingId, setPullingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [pullTarget, setPullTarget] = useState<Device | null>(null);
  const [pullDate, setPullDate] = useState(todayYmd);

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
    setPullDate(todayYmd());
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
  const busy = syncing || pullingId != null;

  const totalPages = Math.max(1, Math.ceil(devices.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageDevices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return devices.slice(start, start + PAGE_SIZE);
  }, [devices, currentPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rangeStart = devices.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, devices.length);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="อุปกรณ์"
        description="Sync จาก Scalefusion (รวมรายละเอียดเครื่องจาก v3) ตั้งชื่อพนักงาน และดึงพิกัดแยกตามอุปกรณ์ได้"
        actions={
          <>
            <Button
              onClick={syncDevices}
              disabled={busy}
              className="h-8 text-[13px]"
            >
              Sync Scalefusion
            </Button>
            <Button
              variant="outline"
              onClick={pollNow}
              disabled={busy}
              className="h-8 text-[13px]"
            >
              Poll ทั้งหมด
            </Button>
            <Button
              variant="outline"
              onClick={backfillRecent}
              disabled={busy}
              className="h-8 text-[13px]"
            >
              Backfill 1 วัน
            </Button>
          </>
        }
        meta={
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {devices.length} อุปกรณ์ · {activeCount} ติดตาม
          </span>
        }
      />

      {message && (
        <p className="mb-6 text-[13px] text-muted-foreground">{message}</p>
      )}

      {pullTarget && (
        <div className="mb-4 rounded-lg border border-primary/25 bg-accent/60 p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">
                ดึงพิกัด · {pullTarget.employeeName ?? pullTarget.deviceName}
              </p>
              <p className="truncate text-[12px] text-muted-foreground">
                {pullTarget.deviceName}
              </p>
            </div>
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
                min={daysAgoYmd(30)}
                max={todayYmd()}
                onChange={(e) => setPullDate(e.target.value)}
                className="h-9 w-full sm:w-[180px]"
                autoFocus
              />
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 sm:flex-none"
                disabled={pullingId != null}
                onClick={() => setPullTarget(null)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                className="h-9 flex-1 sm:flex-none"
                disabled={!pullDate || pullingId != null}
                onClick={() => pullDevice(pullTarget, pullDate)}
              >
                {pullingId === pullTarget.id ? "กำลังดึง..." : "ดึงพิกัด"}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Scalefusion เก็บประวัติประมาณ 30 วันล่าสุด
          </p>
        </div>
      )}

      <div className="overflow-x-auto border">
        <table className="workspace-table">
          <thead>
            <tr>
              <th>SF ID</th>
              <th>อุปกรณ์</th>
              <th>พนักงาน</th>
              <th>สถานะ SF</th>
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
                  colSpan={10}
                  className="py-8 text-center text-[13px] text-muted-foreground"
                >
                  ยังไม่มีอุปกรณ์
                </td>
              </tr>
            ) : (
              pageDevices.map((d) => (
              <tr key={d.id}>
                <td className="font-mono text-[12px] text-muted-foreground">
                  {d.scalefusionDeviceId}
                </td>
                <td className="text-[13px]">
                  <div>{d.deviceName}</div>
                  {d.sfGroupName && (
                    <div className="text-[11px] text-muted-foreground">
                      SF: {d.sfGroupName}
                    </div>
                  )}
                </td>
                <td>
                  <Input
                    defaultValue={d.employeeName ?? ""}
                    onBlur={(e) =>
                      updateDevice(d.id, { employeeName: e.target.value })
                    }
                    className="h-8 max-w-[180px] text-[13px]"
                  />
                </td>
                <td className="text-[12px] text-muted-foreground">
                  {d.connectionStatus ?? "—"}
                </td>
                <td
                  className={`text-[12px] tabular-nums ${
                    (d.batteryPercent ?? 100) <= 15
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
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
                  {d.groups.map((g) => g.name).join(", ") || "—"}
                </td>
                <td>
                  <Button
                    variant={d.isActive ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 text-[12px]"
                    disabled={busy}
                    onClick={() =>
                      updateDevice(d.id, { isActive: !d.isActive })
                    }
                  >
                    {d.isActive ? "เปิด" : "ปิด"}
                  </Button>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[12px]"
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
                      className="h-7 text-[12px]"
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

      {devices.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] tabular-nums text-muted-foreground">
            แสดง {rangeStart}–{rangeEnd} จาก {devices.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[12px]"
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
              className="h-7 text-[12px]"
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
          <h2 className="text-[15px] font-semibold">Sync logs</h2>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            {logs.length} รายการล่าสุด
          </span>
        </div>
        <div className="max-h-[min(50vh,420px)] overflow-y-auto overflow-x-auto border">
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
                    className="py-8 text-center text-[13px] text-muted-foreground"
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
                          className={
                            failed ? "text-destructive" : "text-foreground"
                          }
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

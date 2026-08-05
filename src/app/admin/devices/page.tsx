"use client";

import { useEffect, useState } from "react";
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

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [pullingId, setPullingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

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

  async function pullDevice(device: Device) {
    setPullingId(device.id);
    setMessage("");
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "device-poll", deviceId: device.id }),
    });
    setPullingId(null);
    if (res.ok) {
      const data = await res.json();
      setMessage(
        `ดึง ${data.deviceName}: +${data.recordsAdded} จุดใหม่ (API ${data.apiCount} จุด · ${data.date})`
      );
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "ดึงพิกัดล้มเหลว");
    }
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
            {devices.map((d) => (
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
                      onClick={() => pullDevice(d)}
                      title={
                        d.isActive
                          ? "ดึงพิกัดวันนี้ของอุปกรณ์นี้จาก Scalefusion"
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
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-[15px] font-semibold">Sync logs</h2>
        <div className="overflow-x-auto border">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>เวลา</th>
                <th>ประเภท</th>
                <th>สถานะ</th>
                <th>Records</th>
                <th>Error</th>
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
                logs.map((l) => (
                  <tr key={l.id}>
                    <td className="text-[12px] tabular-nums text-muted-foreground">
                      {formatDateTime(l.createdAt)}
                    </td>
                    <td className="text-[12px]">{l.syncType}</td>
                    <td className="text-[12px]">
                      <span
                        className={
                          l.status === "SUCCESS"
                            ? "text-foreground"
                            : "text-destructive"
                        }
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="tabular-nums">{l.recordsAdded}</td>
                    <td className="text-[12px] text-destructive">
                      {l.errorMessage ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { List, Search, X } from "lucide-react";
import {
  DeviceLocation,
  formatBattery,
  formatDateTime,
  getDeviceStatus,
  googleMapsNavUrl,
  googleMapsViewUrl,
} from "@/lib/types";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const RealtimeMap = dynamic(
  () => import("@/components/map/RealtimeMap").then((m) => m.RealtimeMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-background" aria-label="กำลังโหลดแผนที่" />
    ),
  }
);

function DeviceListPanel({
  filteredDevices,
  groups,
  selectedGroup,
  setSelectedGroup,
  search,
  setSearch,
  loading,
  counts,
  lastRefresh,
  selectedDeviceId,
  setSelectedDeviceId,
  selectedDevice,
  onPickDevice,
}: {
  filteredDevices: DeviceLocation[];
  groups: { id: string; name: string }[];
  selectedGroup: string;
  setSelectedGroup: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  loading: boolean;
  counts: { online: number; idle: number; offline: number };
  lastRefresh: Date | null;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  selectedDevice: DeviceLocation | undefined;
  onPickDevice?: (id: string) => void;
}) {
  return (
    <>
      <header className="shrink-0 border-b px-4 py-3 pr-12 md:py-4 md:pr-4">
        <h1 className="text-[15px] font-semibold tracking-tight">
          ตำแหน่งปัจจุบัน
        </h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {filteredDevices.length} อุปกรณ์
          {lastRefresh &&
            ` · อัปเดต ${formatDateTime(lastRefresh.toISOString())}`}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {(
            [
              ["online", counts.online],
              ["idle", counts.idle],
              ["offline", counts.offline],
            ] as const
          ).map(([status, count]) => (
            <span key={status} className="inline-stat">
              <StatusDot status={status} showLabel />
              <span className="inline-stat-value">{count}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="shrink-0 space-y-2 border-b px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="ค้นหา"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-[13px] md:h-8"
          />
        </div>
        <Select
          value={selectedGroup}
          onValueChange={(v) => v && setSelectedGroup(v)}
        >
          <SelectTrigger className="h-9 w-full text-[13px] md:h-8">
            <SelectValue placeholder="ทุกกลุ่ม" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกกลุ่ม</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <EmptyState title="กำลังโหลด" />
        ) : filteredDevices.length === 0 ? (
          <EmptyState
            title="ไม่พบอุปกรณ์"
            description="เปลี่ยนตัวกรอง หรือ sync จาก Scalefusion"
          />
        ) : (
          <ul>
            {filteredDevices.map((d) => {
              const status = getDeviceStatus(d.lastSeenAt);
              const active = selectedDeviceId === d.id;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeviceId(d.id);
                      onPickDevice?.(d.id);
                    }}
                    className={cn(
                      "w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent/60 md:py-2.5",
                      active && "bg-accent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">
                          {d.employeeName}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {d.deviceName}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusDot status={status} />
                        {formatBattery(d.batteryPercent, d.batteryCharging) && (
                          <span
                            className={cn(
                              "text-[10px] tabular-nums",
                              (d.batteryPercent ?? 100) <= 15
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatBattery(d.batteryPercent, d.batteryCharging)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] tabular-nums text-muted-foreground">
                      {d.connectionStatus && (
                        <span className="rounded border px-1 py-px text-[10px]">
                          SF {d.connectionStatus}
                        </span>
                      )}
                      {d.lastSeenAt && (
                        <span>{formatDateTime(d.lastSeenAt)}</span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedDevice && (
        <footer className="shrink-0 border-t px-4 py-3">
          <p className="text-[11px] text-muted-foreground">ที่เลือก</p>
          <p className="mt-0.5 text-[13px] font-medium">
            {selectedDevice.employeeName}
          </p>
          <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            {(selectedDevice.make || selectedDevice.model) && (
              <p>
                {[
                  selectedDevice.make
                    ? selectedDevice.make.charAt(0).toUpperCase() +
                      selectedDevice.make.slice(1)
                    : null,
                  selectedDevice.model,
                ]
                  .filter(Boolean)
                  .join(" ")}
                {selectedDevice.osVersion
                  ? ` · Android ${selectedDevice.osVersion}`
                  : ""}
              </p>
            )}
            {formatBattery(
              selectedDevice.batteryPercent,
              selectedDevice.batteryCharging
            ) && (
              <p>
                แบต{" "}
                {formatBattery(
                  selectedDevice.batteryPercent,
                  selectedDevice.batteryCharging
                )}
                {selectedDevice.sfGroupName
                  ? ` · ${selectedDevice.sfGroupName}`
                  : ""}
              </p>
            )}
            {selectedDevice.phoneNo && <p>{selectedDevice.phoneNo}</p>}
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {selectedDevice.latestLocation && (
              <>
                <a
                  href={googleMapsViewUrl(
                    selectedDevice.latestLocation.latitude,
                    selectedDevice.latestLocation.longitude
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium text-foreground underline-offset-4 hover:underline"
                >
                  เปิดพิกัด
                </a>
                <a
                  href={googleMapsNavUrl(
                    selectedDevice.latestLocation.latitude,
                    selectedDevice.latestLocation.longitude
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium text-foreground underline-offset-4 hover:underline"
                >
                  นำทาง
                </a>
              </>
            )}
            <Link
              href={`/history?deviceId=${selectedDevice.id}`}
              className="text-[12px] font-medium text-foreground underline-offset-4 hover:underline"
            >
              ดูประวัติ
            </Link>
          </div>
        </footer>
      )}
    </>
  );
}

export default function MapPage() {
  const [devices, setDevices] = useState<DeviceLocation[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [devicesRes, groupsRes] = await Promise.all([
        fetch("/api/locations/latest"),
        fetch("/api/groups"),
      ]);
      if (devicesRes.ok) {
        const data = await devicesRes.json();
        setDevices(data.devices ?? []);
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups ?? []);
      }
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchGroup =
        selectedGroup === "all" ||
        d.groups.some((g) => g.id === selectedGroup);
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.employeeName.toLowerCase().includes(q) ||
        d.deviceName.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [devices, selectedGroup, search]);

  const counts = useMemo(() => {
    return filteredDevices.reduce(
      (acc, d) => {
        acc[getDeviceStatus(d.lastSeenAt)]++;
        return acc;
      },
      { online: 0, idle: 0, offline: 0 }
    );
  }, [filteredDevices]);

  const selectedDevice = filteredDevices.find((d) => d.id === selectedDeviceId);

  const listProps = {
    filteredDevices,
    groups,
    selectedGroup,
    setSelectedGroup,
    search,
    setSearch,
    loading,
    counts,
    lastRefresh,
    selectedDeviceId,
    setSelectedDeviceId,
    selectedDevice,
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden">
      {/* Desktop list */}
      <aside className="hidden h-full w-[280px] shrink-0 flex-col overflow-hidden border-r bg-background md:flex">
        <DeviceListPanel {...listProps} />
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <RealtimeMap
          devices={filteredDevices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={(id) => {
            setSelectedDeviceId(id);
            setListOpen(false);
          }}
        />

        {/* Mobile: open device list */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-between gap-2 p-3 md:hidden">
          <Button
            type="button"
            size="sm"
            className="pointer-events-auto h-9 gap-1.5 shadow-md"
            onClick={() => setListOpen(true)}
          >
            <List className="size-3.5" />
            รายการ
            <span className="tabular-nums opacity-80">
              {filteredDevices.length}
            </span>
          </Button>
        </div>
      </div>

      {/* Mobile sheet */}
      {listOpen && (
        <div className="fixed inset-0 z-[1150] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/25 animate-in fade-in-0"
            aria-label="ปิดรายการ"
            onClick={() => setListOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[min(78dvh,640px)] flex-col overflow-hidden rounded-t-2xl border-t bg-background shadow-lg animate-in slide-in-from-bottom-4 duration-200"
            style={{
              paddingBottom: "calc(3.75rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-3 top-3 z-10"
                onClick={() => setListOpen(false)}
                aria-label="ปิด"
              >
                <X className="size-4" />
              </Button>
              <DeviceListPanel
                {...listProps}
                onPickDevice={() => setListOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type StatusName = "online" | "idle" | "offline";

const STATUS_FILTERS: { status: StatusName; label: string }[] = [
  { status: "online", label: "ออนไลน์" },
  { status: "idle", label: "นิ่ง" },
  { status: "offline", label: "ออฟไลน์" },
];

function seenAgo(iso: string | null): string {
  if (!iso) return "ยังไม่เคยเห็น";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  return formatDateTime(iso);
}

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
  totalCount,
  lastRefresh,
  statusFilter,
  setStatusFilter,
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
  totalCount: number;
  lastRefresh: Date | null;
  statusFilter: StatusName | "all";
  setStatusFilter: (v: StatusName | "all") => void;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  selectedDevice: DeviceLocation | undefined;
  onPickDevice?: (id: string) => void;
}) {
  const activeRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedDeviceId]);

  return (
    <>
      <header className="shrink-0 border-b px-4 py-4 pr-12 md:pr-4">
        <h1 className="text-xl font-semibold tracking-tight">ตำแหน่ง</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {statusFilter === "all"
            ? `${totalCount} อุปกรณ์`
            : `แสดง ${filteredDevices.length} จาก ${totalCount}`}
          {lastRefresh &&
            ` · อัปเดต ${formatDateTime(lastRefresh.toISOString())}`}
        </p>
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="กรองตามสถานะ"
        >
          {STATUS_FILTERS.map(({ status, label }) => {
            const pressed = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={pressed}
                onClick={() => setStatusFilter(pressed ? "all" : status)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 border px-2.5 text-sm",
                  pressed
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                <StatusDot status={status} />
                {label}
                <span className="tabular-nums">{counts[status]}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="shrink-0 space-y-2 border-b px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="ค้นหาชื่อหรืออุปกรณ์"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-8 text-sm"
          />
        </div>
        <Select
          value={selectedGroup}
          onValueChange={(v) => v && setSelectedGroup(v)}
        >
          <SelectTrigger className="!h-10 w-full text-sm">
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
            description={
              statusFilter === "all" && !search && selectedGroup === "all"
                ? "รอ sync จาก Scalefusion"
                : "ลองเปลี่ยนตัวกรองหรือคำค้น"
            }
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
                    ref={active ? activeRowRef : undefined}
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedDeviceId(d.id);
                      if (d.latestLocation) onPickDevice?.(d.id);
                    }}
                    className={cn(
                      "relative w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent/60",
                      active && "bg-accent/60"
                    )}
                  >
                    {active && (
                      <span className="absolute inset-y-2 left-0 w-0.5 origin-center rounded-full bg-primary animate-nav-in" />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {d.employeeName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.deviceName}
                        </p>
                      </div>
                      {formatBattery(d.batteryPercent, d.batteryCharging) && (
                        <span
                          className={cn(
                            "shrink-0 text-xs tabular-nums",
                            (d.batteryPercent ?? 100) <= 15
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatBattery(d.batteryPercent, d.batteryCharging)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <StatusDot status={status} showLabel />
                      <span className="tabular-nums">{seenAgo(d.lastSeenAt)}</span>
                      {!d.latestLocation && (
                        <span className="text-foreground">ไม่มีพิกัด</span>
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
          <p className="text-xs text-muted-foreground">ที่เลือก</p>
          <p className="mt-0.5 text-sm font-medium">
            {selectedDevice.employeeName}
          </p>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
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
          {!selectedDevice.latestLocation && (
            <p className="mt-2 text-xs text-foreground">ยังไม่มีพิกัดบนแผนที่</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDevice.latestLocation && (
              <Button
                render={
                  <a
                    href={googleMapsNavUrl(
                      selectedDevice.latestLocation.latitude,
                      selectedDevice.latestLocation.longitude
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                className="h-9"
              >
                นำทาง
              </Button>
            )}
            <Button
              variant="outline"
              className="h-9"
              render={
                <Link href={`/history?deviceId=${selectedDevice.id}`} />
              }
            >
              ดูประวัติ
            </Button>
            {selectedDevice.latestLocation && (
              <Button
                variant="outline"
                className="h-9"
                render={
                  <a
                    href={googleMapsViewUrl(
                      selectedDevice.latestLocation.latitude,
                      selectedDevice.latestLocation.longitude
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                เปิดพิกัด
              </Button>
            )}
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
  const [statusFilter, setStatusFilter] = useState<StatusName | "all">("all");
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

  const matchedDevices = useMemo(() => {
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
    return matchedDevices.reduce(
      (acc, d) => {
        acc[getDeviceStatus(d.lastSeenAt)]++;
        return acc;
      },
      { online: 0, idle: 0, offline: 0 }
    );
  }, [matchedDevices]);

  const filteredDevices = useMemo(() => {
    if (statusFilter === "all") return matchedDevices;
    return matchedDevices.filter(
      (d) => getDeviceStatus(d.lastSeenAt) === statusFilter
    );
  }, [matchedDevices, statusFilter]);

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
    totalCount: matchedDevices.length,
    lastRefresh,
    statusFilter,
    setStatusFilter,
    selectedDeviceId,
    setSelectedDeviceId,
    selectedDevice,
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden animate-fade-up">
      {/* Desktop list */}
      <aside className="hidden h-full w-[320px] shrink-0 flex-col overflow-hidden border-r bg-background md:flex">
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
            className="pointer-events-auto h-10 gap-1.5 shadow-sm"
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
            className="absolute inset-0 bg-[var(--scrim)] animate-in fade-in-0"
            aria-label="ปิดรายการ"
            onClick={() => setListOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[min(78dvh,640px)] flex-col overflow-hidden border-t bg-background shadow-lg animate-in slide-in-from-bottom-4 duration-200"
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

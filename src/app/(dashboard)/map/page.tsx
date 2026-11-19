"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Battery,
  History as HistoryIcon,
  List,
  MapPinned,
  Navigation,
  Search,
  X,
} from "lucide-react";
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
import { FadeIn } from "@/components/motion";

const RealtimeMap = dynamic(
  () => import("@/components/map/RealtimeMap").then((m) => m.RealtimeMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-muted/40" aria-label="กำลังโหลดแผนที่" />
    ),
  }
);

type StatusFilter = "all" | "online" | "idle" | "offline";

const STATUS_LABEL: Record<Exclude<StatusFilter, "all">, string> = {
  online: "ออนไลน์",
  idle: "ไม่เคลื่อนไหว",
  offline: "ออฟไลน์",
};

function DeviceListPanel({
  filteredDevices,
  groups,
  selectedGroup,
  setSelectedGroup,
  search,
  setSearch,
  loading,
  counts,
  statusFilter,
  setStatusFilter,
  lastRefresh,
  selectedDeviceId,
  setSelectedDeviceId,
  onPickDevice,
  compact,
}: {
  filteredDevices: DeviceLocation[];
  groups: { id: string; name: string }[];
  selectedGroup: string;
  setSelectedGroup: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  loading: boolean;
  counts: { online: number; idle: number; offline: number };
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  lastRefresh: Date | null;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  onPickDevice?: (id: string) => void;
  compact?: boolean;
}) {
  const activeRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedDeviceId]);

  const total =
    counts.online + counts.idle + counts.offline;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className={cn(
          "shrink-0 border-b border-border/50",
          compact ? "px-4 pb-4 pt-5 pr-12" : "px-4 py-4"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Live track
            </p>
            <h1 className="mt-1 font-brand text-lg font-semibold tracking-tight">
              ฟลีตบนแผนที่
            </h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {filteredDevices.length}
              </span>
              /{total} แสดงผล
              {lastRefresh &&
                ` · ${formatDateTime(lastRefresh.toISOString())}`}
            </p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPinned className="size-4" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-muted/70 p-1">
          {(
            [
              ["online", counts.online],
              ["idle", counts.idle],
              ["offline", counts.offline],
            ] as const
          ).map(([status, count]) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setStatusFilter(active ? "all" : status)
                }
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl px-1 py-1.5 transition-all duration-200",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={active}
              >
                <StatusDot status={status} />
                <span className="mt-1 text-[11px] font-semibold tabular-nums">
                  {count}
                </span>
                <span className="sr-only">{STATUS_LABEL[status]}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="shrink-0 space-y-2 border-b border-border/50 px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="ค้นหาชื่อหรืออุปกรณ์"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border-border/60 bg-background/80 pl-9 text-sm"
          />
        </div>
        <Select
          value={selectedGroup}
          onValueChange={(v) => v && setSelectedGroup(v)}
        >
          <SelectTrigger className="!h-10 w-full rounded-xl border-border/60 bg-background/80 text-sm">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {loading ? (
          <EmptyState title="กำลังโหลด" />
        ) : filteredDevices.length === 0 ? (
          <EmptyState
            title="ไม่พบอุปกรณ์"
            description="เปลี่ยนตัวกรอง หรือ sync จาก Scalefusion"
          />
        ) : (
          <ul className="space-y-1.5">
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
                      onPickDevice?.(d.id);
                    }}
                    className={cn(
                      "relative w-full cursor-pointer rounded-2xl px-3 py-3 text-left transition-all duration-200",
                      active
                        ? "bg-primary/12 ring-1 ring-primary/30"
                        : "hover:bg-muted/80"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                          status === "online" && "bg-status-online/15",
                          status === "idle" && "bg-status-idle/15",
                          status === "offline" && "bg-muted"
                        )}
                      >
                        <StatusDot status={status} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold tracking-tight">
                            {d.employeeName || d.deviceName}
                          </p>
                          {formatBattery(d.batteryPercent, d.batteryCharging) && (
                            <span
                              className={cn(
                                "inline-flex shrink-0 items-center gap-0.5 text-[11px] tabular-nums",
                                (d.batteryPercent ?? 100) <= 15
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              )}
                            >
                              <Battery className="size-3" />
                              {formatBattery(
                                d.batteryPercent,
                                d.batteryCharging
                              )}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {d.deviceName}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground">
                          {d.connectionStatus && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium">
                              SF {d.connectionStatus}
                            </span>
                          )}
                          {d.lastSeenAt && (
                            <span>{formatDateTime(d.lastSeenAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SelectedDeviceCard({
  device,
  onClose,
}: {
  device: DeviceLocation;
  onClose: () => void;
}) {
  const status = getDeviceStatus(device.lastSeenAt);
  const battery = formatBattery(device.batteryPercent, device.batteryCharging);

  return (
    <FadeIn className="pointer-events-auto w-full max-w-lg">
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="flex items-start gap-2.5 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
          <span
            className={cn(
              "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
              status === "online" && "bg-status-online/15",
              status === "idle" && "bg-status-idle/15",
              status === "offline" && "bg-muted"
            )}
          >
            <StatusDot status={status} showLabel />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-brand text-base font-semibold tracking-tight">
              {device.employeeName || device.deviceName}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {device.deviceName}
              {device.sfGroupName ? ` · ${device.sfGroupName}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {[
                device.make
                  ? device.make.charAt(0).toUpperCase() + device.make.slice(1)
                  : null,
                device.model,
                device.osVersion ? `Android ${device.osVersion}` : null,
                battery ? `แบต ${battery}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 cursor-pointer rounded-full"
            onClick={onClose}
            aria-label="ปิดรายละเอียด"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-border/50 bg-muted/30 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
          {device.latestLocation && (
            <Button
              render={
                <a
                  href={googleMapsNavUrl(
                    device.latestLocation.latitude,
                    device.latestLocation.longitude
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="h-9 flex-1 cursor-pointer gap-1.5 rounded-xl sm:flex-none"
            >
              <Navigation className="size-3.5" />
              นำทาง
            </Button>
          )}
          <Button
            variant="outline"
            className="h-9 flex-1 cursor-pointer gap-1.5 rounded-xl sm:flex-none"
            render={<Link href={`/history?deviceId=${device.id}`} />}
          >
            <HistoryIcon className="size-3.5" />
            ประวัติ
          </Button>
          {device.latestLocation && (
            <Button
              variant="outline"
              className="h-9 flex-1 cursor-pointer gap-1.5 rounded-xl sm:flex-none"
              render={
                <a
                  href={googleMapsViewUrl(
                    device.latestLocation.latitude,
                    device.latestLocation.longitude
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <MapPinned className="size-3.5" />
              พิกัด
            </Button>
          )}
        </div>
      </div>
    </FadeIn>
  );
}

export default function MapPage() {
  const [devices, setDevices] = useState<DeviceLocation[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const counts = useMemo(() => {
    return devices
      .filter((d) => {
        const matchGroup =
          selectedGroup === "all" ||
          d.groups.some((g) => g.id === selectedGroup);
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          d.employeeName.toLowerCase().includes(q) ||
          d.deviceName.toLowerCase().includes(q);
        return matchGroup && matchSearch;
      })
      .reduce(
        (acc, d) => {
          acc[getDeviceStatus(d.lastSeenAt)]++;
          return acc;
        },
        { online: 0, idle: 0, offline: 0 }
      );
  }, [devices, selectedGroup, search]);

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
      const status = getDeviceStatus(d.lastSeenAt);
      const matchStatus =
        statusFilter === "all" || status === statusFilter;
      return matchGroup && matchSearch && matchStatus;
    });
  }, [devices, selectedGroup, search, statusFilter]);

  const selectedDevice =
    devices.find((d) => d.id === selectedDeviceId) ??
    filteredDevices.find((d) => d.id === selectedDeviceId);

  const listProps = {
    filteredDevices,
    groups,
    selectedGroup,
    setSelectedGroup,
    search,
    setSearch,
    loading,
    counts,
    statusFilter,
    setStatusFilter,
    lastRefresh,
    selectedDeviceId,
    setSelectedDeviceId,
  };

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden animate-fade-up md:rounded-[1.25rem]">
      {/* Map is the full stage */}
      <div className="absolute inset-0 overflow-hidden md:rounded-[1.25rem]">
        <RealtimeMap
          devices={filteredDevices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={(id) => {
            setSelectedDeviceId(id);
            setListOpen(false);
          }}
        />
      </div>

      {/* Desktop floating roster */}
      <aside className="pointer-events-none absolute inset-y-3 left-3 z-[1000] hidden w-[360px] md:block">
        <div className="pointer-events-auto glass-panel flex h-full max-h-full flex-col overflow-hidden rounded-[1.35rem] shadow-[0_20px_60px_-24px_rgba(15,23,42,0.55)]">
          <DeviceListPanel {...listProps} />
        </div>
      </aside>

      {/* Selected device action card on map */}
      {selectedDevice && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[1000] flex justify-center sm:inset-x-3 sm:bottom-3 md:inset-x-auto md:bottom-4 md:left-[392px] md:right-4 md:justify-start">
          <SelectedDeviceCard
            device={selectedDevice}
            onClose={() => setSelectedDeviceId(null)}
          />
        </div>
      )}

      {/* Mobile open list */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-between gap-2 p-2 sm:p-3 md:hidden"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <Button
          type="button"
          size="sm"
          className="pointer-events-auto h-10 cursor-pointer gap-1.5 rounded-full px-3.5 shadow-lg sm:h-11 sm:px-4"
          onClick={() => setListOpen(true)}
        >
          <List className="size-3.5" />
          รายการ
          <span className="tabular-nums opacity-80">
            {filteredDevices.length}
          </span>
        </Button>
      </div>

      {/* Mobile sheet */}
      {listOpen && (
        <div className="fixed inset-0 z-[1150] md:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-[var(--scrim)] animate-in fade-in-0"
            aria-label="ปิดรายการ"
            onClick={() => setListOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[min(82dvh,680px)] flex-col overflow-hidden rounded-t-[1.5rem] border-t border-border/70 bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
            style={{
              paddingBottom: "calc(4.25rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-3 top-3 z-10 cursor-pointer rounded-full"
                onClick={() => setListOpen(false)}
                aria-label="ปิด"
              >
                <X className="size-4" />
              </Button>
              <DeviceListPanel
                {...listProps}
                compact
                onPickDevice={() => setListOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

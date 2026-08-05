"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DeviceLocation, formatDateTime, getDeviceStatus } from "@/lib/types";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <div className="h-full bg-muted/30" aria-label="กำลังโหลดแผนที่" />
    ),
  }
);

export default function MapPage() {
  const [devices, setDevices] = useState<DeviceLocation[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-[280px] shrink-0 flex-col border-r bg-background">
        <header className="border-b px-4 py-4">
          <h1 className="text-[15px] font-semibold tracking-tight">
            ตำแหน่งปัจจุบัน
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {filteredDevices.length} อุปกรณ์
            {lastRefresh && ` · อัปเดต ${formatDateTime(lastRefresh.toISOString())}`}
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

        <div className="space-y-2 border-b px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ค้นหา"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-[13px]"
            />
          </div>
          <Select
            value={selectedGroup}
            onValueChange={(v) => v && setSelectedGroup(v)}
          >
            <SelectTrigger className="h-8 w-full text-[13px]">
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

        <ScrollArea className="min-h-0 flex-1">
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
                      onClick={() => setSelectedDeviceId(d.id)}
                      className={cn(
                        "w-full border-b px-4 py-2.5 text-left transition-colors hover:bg-muted/40",
                        active && "bg-muted/60"
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
                        <StatusDot status={status} />
                      </div>
                      {d.lastSeenAt && (
                        <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                          {formatDateTime(d.lastSeenAt)}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {selectedDevice && (
          <footer className="border-t px-4 py-3">
            <p className="text-[11px] text-muted-foreground">ที่เลือก</p>
            <p className="mt-0.5 text-[13px] font-medium">
              {selectedDevice.employeeName}
            </p>
            <Link
              href={`/history?deviceId=${selectedDevice.id}`}
              className="mt-2 inline-block text-[12px] text-foreground underline-offset-4 hover:underline"
            >
              ดูประวัติเส้นทาง
            </Link>
          </footer>
        )}
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1">
        <RealtimeMap
          devices={filteredDevices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
        />
      </div>
    </div>
  );
}

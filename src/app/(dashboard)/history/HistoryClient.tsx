"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DeviceLocation,
  HistoryLocation,
  StopPoint,
  detectStops,
  formatDateTime,
  formatDurationMinutes,
  googleMapsNavUrl,
} from "@/lib/types";
import { todayYmdInAppTz } from "@/lib/app-timezone";
import {
  computeHistoryCoverage,
  formatCoverageArea,
} from "@/lib/coverage-area";
import { formatSpeedKmh, segmentSpeedKmh } from "@/lib/route-speed";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DeviceSearchSelect } from "@/components/ui/device-search-select";
import { DatePickerWithMarkers } from "@/components/ui/date-picker-with-markers";
import { cn } from "@/lib/utils";

const HistoryMap = dynamic(
  () => import("@/components/map/HistoryMap").then((m) => m.HistoryMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-background" aria-label="กำลังโหลดแผนที่" />
    ),
  }
);

export default function HistoryClient() {
  const searchParams = useSearchParams();
  const initialDeviceId = searchParams.get("deviceId") ?? "";

  const [devices, setDevices] = useState<DeviceLocation[]>([]);
  const [deviceId, setDeviceId] = useState(initialDeviceId);
  const [date, setDate] = useState(todayYmdInAppTz());
  const [locations, setLocations] = useState<HistoryLocation[]>([]);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [datesWithData, setDatesWithData] = useState<Record<string, number>>(
    {}
  );
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [showCoverage, setShowCoverage] = useState(true);

  useEffect(() => {
    fetch("/api/devices")
      .then((r) => r.json())
      .then((data) => setDevices(data.devices ?? []));
  }, []);

  useEffect(() => {
    if (initialDeviceId) setDeviceId(initialDeviceId);
  }, [initialDeviceId]);

  useEffect(() => {
    if (!deviceId) {
      setDatesWithData({});
      return;
    }

    let cancelled = false;
    fetch(`/api/locations/available-dates?deviceId=${deviceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const map: Record<string, number> = {};
        for (const row of data.dates ?? []) {
          map[row.date] = row.count;
        }
        setDatesWithData(map);

        const dates = (data.dates ?? []) as { date: string; count: number }[];
        if (dates.length > 0 && !map[date]) {
          setDate(dates[0]!.date);
        }
      })
      .catch(() => {
        if (!cancelled) setDatesWithData({});
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const fetchHistory = useCallback(async () => {
    if (!deviceId || !date) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/locations/history?deviceId=${deviceId}&date=${date}`
      );
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations ?? []);
        const locs = (data.locations ?? []) as HistoryLocation[];
        setSliderIndex(Math.max(0, locs.length - 1));
        setSelectedStopId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId, date]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const stops = useMemo(
    () =>
      detectStops(locations, {
        radiusMeters: 60,
        minDurationMinutes: 5,
      }),
    [locations]
  );

  const coverage = useMemo(
    () => computeHistoryCoverage(locations),
    [locations]
  );

  const currentPoint = locations[sliderIndex] ?? null;
  const speedKmh = useMemo(() => {
    if (sliderIndex === 0 || locations.length < 2) return null;
    const prev = locations[sliderIndex - 1]!;
    const curr = locations[sliderIndex]!;
    return formatSpeedKmh(segmentSpeedKmh(prev, curr));
  }, [locations, sliderIndex]);

  const selectedDevice = devices.find((d) => d.id === deviceId);
  const deviceOptions = useMemo(
    () =>
      devices.map((d) => ({
        id: d.id,
        employeeName: d.employeeName,
        deviceName: d.deviceName,
      })),
    [devices]
  );

  const pointCountForDate = datesWithData[date];

  function selectStop(stop: StopPoint) {
    setSelectedStopId(stop.id);
    setSliderIndex(stop.startIndex);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-[1100] mx-3 mt-3 flex shrink-0 flex-wrap items-end gap-3 rounded-lg border bg-background px-3 py-3 sm:mx-5 sm:mt-5 sm:px-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-[220px]">
          <p className="mb-1 text-[11px] text-muted-foreground">พนักงาน</p>
          <DeviceSearchSelect
            devices={deviceOptions}
            value={deviceId}
            onChange={setDeviceId}
          />
        </div>
        <div className="w-[calc(50%-0.375rem)] min-w-0 sm:w-[170px]">
          <p className="mb-1 text-[11px] text-muted-foreground">วันที่</p>
          <DatePickerWithMarkers
            value={date}
            onChange={setDate}
            datesWithData={datesWithData}
            disabled={!deviceId}
          />
        </div>
        <Button
          onClick={fetchHistory}
          disabled={!deviceId || loading}
          className="h-9 flex-1 sm:h-8 sm:flex-none"
        >
          {loading ? "กำลังโหลด..." : "โหลด"}
        </Button>
        <div className="ml-auto hidden min-w-0 text-right md:block">
          <p className="truncate text-[13px] font-medium">
            {selectedDevice
              ? selectedDevice.employeeName || selectedDevice.deviceName
              : "ประวัติเส้นทาง"}
          </p>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {locations.length > 0
              ? `${locations.length} จุด · หยุด ${stops.length} แห่ง · ครอบคลุม ${coverage ? formatCoverageArea(coverage.areaSqMeters) : "—"} · ${date}`
              : deviceId
                ? pointCountForDate
                  ? `มี ${pointCountForDate} จุดในฐานข้อมูล · กดโหลด`
                  : "ยังไม่มีจุดในวันที่นี้"
                : "เลือกพนักงานเพื่อดูเส้นทาง"}
          </p>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 sm:p-5 lg:flex-row lg:items-start lg:overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:overflow-hidden">
          <div className="relative h-[42vh] min-h-[240px] shrink-0 overflow-hidden rounded-lg border bg-background sm:h-[min(50vh,480px)] lg:h-[min(58vh,560px)] lg:min-h-[320px]">
            <HistoryMap
              locations={locations}
              highlightIndex={sliderIndex}
              stops={stops}
              selectedStopId={selectedStopId}
              onSelectStop={selectStop}
              speedLabel={speedKmh}
              coverage={coverage}
              showCoverage={showCoverage}
              layoutKey={`${deviceId}:${date}:panel=${locations.length > 0 ? 1 : 0}:aside=${deviceId ? 1 : 0}`}
            />

            {locations.length > 0 && coverage && (
              <div className="absolute bottom-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
                <div className="rounded-md border bg-background/95 px-2.5 py-1.5 text-[11px] shadow-sm">
                  <span className="inline-block size-2 rounded-sm bg-[#0d9488]/40 align-middle" />{" "}
                  ครอบคลุม{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCoverageArea(coverage.areaSqMeters)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    (รัศมี {coverage.bufferMeters} ม.)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCoverage((v) => !v)}
                  className="rounded-md border bg-background/95 px-2.5 py-1.5 text-[11px] shadow-sm transition-colors hover:bg-muted/60"
                >
                  {showCoverage ? "ซ่อนพื้นที่" : "แสดงพื้นที่"}
                </button>
              </div>
            )}

            {!deviceId && (
              <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center px-3">
                <p className="rounded-md border bg-background/90 px-3 py-1.5 text-[12px] text-muted-foreground shadow-sm">
                  ค้นหาและเลือกพนักงานด้านบน
                </p>
              </div>
            )}

            {deviceId && !loading && locations.length === 0 && (
              <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center px-3">
                <p className="rounded-md border bg-background/90 px-3 py-1.5 text-center text-[12px] text-muted-foreground shadow-sm">
                  ไม่พบข้อมูลในวันที่ {date}
                  {Object.keys(datesWithData).length === 0
                    ? " — รอ backfill หรือ poll ก่อน"
                    : ""}
                </p>
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-lg border bg-background px-4 py-3">
            {locations.length > 0 && currentPoint ? (
              <>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] text-muted-foreground">
                    จุดที่{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {sliderIndex + 1}
                    </span>{" "}
                    / {locations.length}
                    {sliderIndex === locations.length - 1 && (
                      <span className="ml-2 text-[11px] text-foreground">
                        · ล่าสุด
                      </span>
                    )}
                  </p>
                  <p className="text-[13px] tabular-nums text-muted-foreground">
                    {formatDateTime(currentPoint.recordedAt)}
                  </p>
                </div>
                <Slider
                  min={0}
                  max={Math.max(0, locations.length - 1)}
                  value={[sliderIndex]}
                  orientation="horizontal"
                  className="w-full"
                  onValueChange={(v) => {
                    setSelectedStopId(null);
                    setSliderIndex(Array.isArray(v) ? (v[0] ?? 0) : v);
                  }}
                />
                <dl className="mt-3 grid grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Lat</dt>
                    <dd className="mt-0.5 text-[12px] tabular-nums sm:text-[13px]">
                      {currentPoint.latitude.toFixed(5)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Lng</dt>
                    <dd className="mt-0.5 text-[12px] tabular-nums sm:text-[13px]">
                      {currentPoint.longitude.toFixed(5)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">
                      ความเร็ว
                    </dt>
                    <dd className="mt-0.5 text-[12px] tabular-nums sm:text-[13px]">
                      {speedKmh ? `${speedKmh} km/h` : "—"}
                    </dd>
                  </div>
                </dl>
                <a
                  href={googleMapsNavUrl(
                    currentPoint.latitude,
                    currentPoint.longitude
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-[12px] font-medium text-foreground underline-offset-4 hover:underline"
                >
                  นำทางด้วย Google Maps →
                </a>
              </>
            ) : (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                {deviceId
                  ? loading
                    ? "กำลังโหลดจุด..."
                    : "โหลดเส้นทางเพื่อเลื่อนดูจุด"
                  : "เลือกพนักงานแล้วโหลดเส้นทาง"}
              </p>
            )}
          </div>
        </div>

        {deviceId ? (
          <aside className="flex max-h-[40vh] w-full shrink-0 flex-col overflow-hidden rounded-lg border bg-background lg:h-[min(58vh,560px)] lg:max-h-none lg:min-h-[320px] lg:w-[280px] lg:self-start">
            <div className="shrink-0 border-b px-4 py-3">
              <p className="text-[13px] font-medium">จุดที่หยุด</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                อยู่ในรัศมี 60 ม. ≥ 5 นาที
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-8 text-[12px] text-muted-foreground">
                  กำลังโหลด...
                </p>
              ) : locations.length === 0 ? (
                <p className="px-4 py-8 text-[12px] text-muted-foreground">
                  ยังไม่มีจุดในวันนี้
                </p>
              ) : stops.length === 0 ? (
                <p className="px-4 py-8 text-[12px] text-muted-foreground">
                  ไม่พบจุดหยุดตามเงื่อนไขในวันนี้
                </p>
              ) : (
                <ul>
                  {stops.map((stop, index) => {
                    const active = selectedStopId === stop.id;
                    return (
                      <li key={stop.id}>
                        <div
                          className={cn(
                            "border-b px-4 py-3 transition-colors",
                            active && "bg-muted/60"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => selectStop(stop)}
                            className="w-full text-left hover:opacity-90"
                          >
                            <div className="flex items-start gap-2.5">
                              <span
                                className={cn(
                                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
                                  active
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-foreground/40"
                                )}
                              >
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium">
                                  {formatDurationMinutes(stop.durationMinutes)}
                                </p>
                                <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                                  {formatDateTime(stop.startAt)}
                                </p>
                                <p className="text-[11px] tabular-nums text-muted-foreground">
                                  → {formatDateTime(stop.endAt)}
                                </p>
                              </div>
                            </div>
                          </button>
                          <a
                            href={googleMapsNavUrl(
                              stop.latitude,
                              stop.longitude
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 ml-7 inline-block text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            นำทาง Google Maps
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

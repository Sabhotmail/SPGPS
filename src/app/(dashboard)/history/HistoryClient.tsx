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
  googleMapsViewUrl,
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
  const [stopsOpen, setStopsOpen] = useState(false);

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
    setStopsOpen(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-[1100] mx-2 mt-2 shrink-0 rounded-lg border bg-background px-2.5 py-2.5 sm:mx-5 sm:mt-5 sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 basis-full sm:basis-[220px]">
            <p className="mb-1 text-[11px] text-muted-foreground">พนักงาน</p>
            <DeviceSearchSelect
              devices={deviceOptions}
              value={deviceId}
              onChange={setDeviceId}
            />
          </div>
          <div className="min-w-0 flex-1 sm:w-[170px] sm:flex-none">
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
            className="h-9 shrink-0 px-4 sm:h-8 sm:flex-none"
          >
            {loading ? "..." : "โหลด"}
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
        </div>
        {locations.length > 0 && (
          <p className="mt-2 text-[11px] tabular-nums text-muted-foreground md:hidden">
            {locations.length} จุด · หยุด {stops.length} ·{" "}
            {coverage ? formatCoverageArea(coverage.areaSqMeters) : "—"}
          </p>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-2 sm:gap-3 sm:p-5 lg:flex-row lg:items-start lg:overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:gap-3 lg:overflow-hidden">
          <div className="relative h-[min(52vh,420px)] min-h-[280px] shrink-0 overflow-hidden rounded-lg border bg-background sm:h-[min(50vh,480px)] lg:h-[min(58vh,560px)] lg:min-h-[320px]">
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
              <div className="absolute bottom-2 left-2 z-[1000] flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 sm:bottom-3 sm:left-3 sm:gap-2">
                <div className="rounded-md border bg-background/95 px-2 py-1 text-[10px] shadow-sm sm:px-2.5 sm:py-1.5 sm:text-[11px]">
                  <span className="inline-block size-2 rounded-sm bg-[#0d9488]/40 align-middle" />{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCoverageArea(coverage.areaSqMeters)}
                  </span>
                  <span className="hidden text-muted-foreground sm:inline">
                    {" "}
                    (รัศมี {coverage.bufferMeters} ม.)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCoverage((v) => !v)}
                  className="rounded-md border bg-background/95 px-2 py-1 text-[10px] shadow-sm transition-colors hover:bg-muted/60 sm:px-2.5 sm:py-1.5 sm:text-[11px]"
                >
                  {showCoverage ? "ซ่อน" : "พื้นที่"}
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

          <div className="shrink-0 rounded-lg border bg-background px-3 py-2.5 sm:px-4 sm:py-3">
            {locations.length > 0 && currentPoint ? (
              <>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] text-muted-foreground sm:text-[13px]">
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
                  <p className="text-[11px] tabular-nums text-muted-foreground sm:text-[13px]">
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
                <dl className="mt-2.5 grid grid-cols-3 gap-2 sm:mt-3 sm:gap-4">
                  <div>
                    <dt className="text-[10px] text-muted-foreground sm:text-[11px]">
                      Lat
                    </dt>
                    <dd className="mt-0.5 text-[11px] tabular-nums sm:text-[13px]">
                      {currentPoint.latitude.toFixed(5)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-muted-foreground sm:text-[11px]">
                      Lng
                    </dt>
                    <dd className="mt-0.5 text-[11px] tabular-nums sm:text-[13px]">
                      {currentPoint.longitude.toFixed(5)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-muted-foreground sm:text-[11px]">
                      ความเร็ว
                    </dt>
                    <dd className="mt-0.5 text-[11px] tabular-nums sm:text-[13px]">
                      {speedKmh ? `${speedKmh} km/h` : "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 sm:mt-3 sm:gap-3">
                  <a
                    href={googleMapsViewUrl(
                      currentPoint.latitude,
                      currentPoint.longitude
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    เปิดพิกัด
                  </a>
                  <a
                    href={googleMapsNavUrl(
                      currentPoint.latitude,
                      currentPoint.longitude
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    นำทาง
                  </a>
                </div>
              </>
            ) : (
              <p className="py-4 text-center text-[12px] text-muted-foreground sm:py-6">
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
          <aside
            className={cn(
              "flex w-full shrink-0 flex-col overflow-hidden rounded-lg border bg-background lg:h-[min(58vh,560px)] lg:max-h-none lg:min-h-[320px] lg:w-[280px] lg:self-start",
              stopsOpen ? "max-h-[50vh]" : "max-h-none lg:max-h-none"
            )}
          >
            <button
              type="button"
              className="flex shrink-0 items-center justify-between border-b px-3 py-2.5 text-left sm:px-4 sm:py-3 lg:pointer-events-none"
              onClick={() => setStopsOpen((v) => !v)}
            >
              <div>
                <p className="text-[13px] font-medium">
                  จุดที่หยุด
                  {stops.length > 0 ? (
                    <span className="ml-1.5 tabular-nums text-muted-foreground">
                      ({stops.length})
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
                  อยู่ในรัศมี 60 ม. ≥ 5 นาที
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground lg:hidden">
                {stopsOpen ? "ซ่อน" : "ดูรายการ"}
              </span>
            </button>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto",
                !stopsOpen && "hidden lg:block"
              )}
            >
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
                            "border-b px-3 py-2.5 transition-colors sm:px-4 sm:py-3",
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
                          <div className="mt-2 ml-7 flex flex-wrap gap-3">
                            <a
                              href={googleMapsViewUrl(
                                stop.latitude,
                                stop.longitude
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              เปิดพิกัด
                            </a>
                            <a
                              href={googleMapsNavUrl(
                                stop.latitude,
                                stop.longitude
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              นำทาง
                            </a>
                          </div>
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

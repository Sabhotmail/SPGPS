"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  History as HistoryIcon,
  List,
  MapPinned,
  Navigation,
  Route,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

const HistoryMap = dynamic(
  () => import("@/components/map/HistoryMap").then((m) => m.HistoryMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-muted/40" aria-label="กำลังโหลดแผนที่" />
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
  const [controlsOpen, setControlsOpen] = useState(!initialDeviceId);
  const [scrubDetailsOpen, setScrubDetailsOpen] = useState(false);

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
        setControlsOpen(false);
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

  const summaryText = locations.length > 0
    ? `${locations.length} จุด · หยุด ${stops.length} · ${coverage ? formatCoverageArea(coverage.areaSqMeters) : "—"}`
    : deviceId
      ? pointCountForDate
        ? `มี ${pointCountForDate} จุดในฐานข้อมูล`
        : "ยังไม่มีจุดในวันที่นี้"
      : "เลือกพนักงานเพื่อเริ่ม";

  const selectFields = (
    <div className="space-y-2">
      <div>
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">
          พนักงาน
        </p>
        <DeviceSearchSelect
          devices={deviceOptions}
          value={deviceId}
          onChange={setDeviceId}
        />
      </div>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">
            วันที่
          </p>
          <DatePickerWithMarkers
            value={date}
            onChange={setDate}
            datesWithData={datesWithData}
            disabled={!deviceId}
          />
        </div>
        <div className="flex shrink-0 flex-col justify-end">
          <Button
            onClick={() => void fetchHistory()}
            disabled={!deviceId || loading}
            className="h-10 cursor-pointer rounded-xl px-4"
          >
            {loading ? "..." : "โหลด"}
          </Button>
        </div>
      </div>
    </div>
  );

  const statsBlock = (
    <>
      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl border border-border/50 bg-muted/60 p-1">
        <div className="rounded-xl px-2 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">จุด</p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {locations.length || "—"}
          </p>
        </div>
        <div className="rounded-xl px-2 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">หยุด</p>
          <p className="mt-0.5 font-semibold tabular-nums">
            {locations.length ? stops.length : "—"}
          </p>
        </div>
        <div className="rounded-xl px-2 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">พื้นที่</p>
          <p className="mt-0.5 text-[12px] font-semibold tabular-nums">
            {coverage ? formatCoverageArea(coverage.areaSqMeters) : "—"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{summaryText}</p>
    </>
  );

  const stopsList = (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {loading ? (
        <p className="px-3 py-8 text-[12px] text-muted-foreground">
          กำลังโหลด...
        </p>
      ) : locations.length === 0 ? (
        <p className="px-3 py-8 text-[12px] text-muted-foreground">
          ยังไม่มีจุดในวันนี้
        </p>
      ) : stops.length === 0 ? (
        <p className="px-3 py-8 text-[12px] text-muted-foreground">
          ไม่พบจุดหยุดตามเงื่อนไข
        </p>
      ) : (
        <ul className="space-y-1.5">
          {stops.map((stop, index) => {
            const active = selectedStopId === stop.id;
            return (
              <li key={stop.id}>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-3 transition-colors",
                    active
                      ? "bg-primary/12 ring-1 ring-primary/30"
                      : "hover:bg-muted/80"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectStop(stop)}
                    className="w-full cursor-pointer text-left"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                          <Clock3 className="size-3.5 text-primary" />
                          {formatDurationMinutes(stop.durationMinutes)}
                        </p>
                        <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                          {formatDateTime(stop.startAt)}
                        </p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          → {formatDateTime(stop.endAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="mt-2 ml-8 flex flex-wrap gap-3">
                    <a
                      href={googleMapsViewUrl(stop.latitude, stop.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      พิกัด
                    </a>
                    <a
                      href={googleMapsNavUrl(stop.latitude, stop.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
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
  );

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden animate-fade-up md:rounded-[1.25rem]">
      {/* Map stage */}
      <div className="absolute inset-0 overflow-hidden md:rounded-[1.25rem]">
        <HistoryMap
          locations={locations}
          highlightIndex={sliderIndex}
          stops={stops}
          selectedStopId={selectedStopId}
          onSelectStop={selectStop}
          speedLabel={speedKmh}
          coverage={coverage}
          showCoverage={showCoverage}
          layoutKey={`${deviceId}:${date}:panel=${locations.length > 0 ? 1 : 0}`}
        />
      </div>

      {/* Mobile compact top bar — keep map visible */}
      <div
        className="pointer-events-none absolute inset-x-2 top-2 z-[1100] md:hidden"
        style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
      >
        <div className="pointer-events-auto glass-panel rounded-2xl p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HistoryIcon className="size-3.5" />
            </div>
            <button
              type="button"
              className="min-w-0 flex-1 cursor-pointer text-left"
              onClick={() => setControlsOpen((v) => !v)}
              aria-expanded={controlsOpen}
            >
              <p className="truncate text-[13px] font-semibold tracking-tight">
                {selectedDevice
                  ? selectedDevice.employeeName || selectedDevice.deviceName
                  : "เลือกพนักงาน"}
              </p>
              <p className="truncate text-[11px] tabular-nums text-muted-foreground">
                {date} · {summaryText}
              </p>
            </button>
            {deviceId && locations.length > 0 && (
              <>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-8 shrink-0 cursor-pointer rounded-xl"
                  onClick={() => setStopsOpen((v) => !v)}
                  aria-label={`จุดหยุด ${stops.length}`}
                  title="จุดหยุด"
                >
                  <List className="size-3.5" />
                </Button>
                {coverage && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className={cn(
                      "size-8 shrink-0 cursor-pointer rounded-xl",
                      showCoverage && "bg-primary/12 text-primary"
                    )}
                    onClick={() => setShowCoverage((v) => !v)}
                    aria-label={showCoverage ? "ซ่อนพื้นที่" : "แสดงพื้นที่"}
                    title={showCoverage ? "ซ่อนพื้นที่" : "แสดงพื้นที่"}
                  >
                    <Route className="size-3.5" />
                  </Button>
                )}
              </>
            )}
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-8 shrink-0 cursor-pointer rounded-xl"
              onClick={() => setControlsOpen((v) => !v)}
              aria-expanded={controlsOpen}
              aria-label="เลือกพนักงานและวันที่"
            >
              {controlsOpen ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <SlidersHorizontal className="size-3.5" />
              )}
            </Button>
          </div>
          {controlsOpen && (
            <div className="mt-2.5 border-t border-border/50 pt-2.5">
              {selectFields}
            </div>
          )}
        </div>
      </div>

      {/* Desktop top controls */}
      <div className="pointer-events-none absolute inset-x-auto left-3 top-3 z-[1100] hidden w-[380px] flex-col gap-2 md:flex">
        <div className="pointer-events-auto glass-panel rounded-[1.25rem] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                Playback
              </p>
              <h1 className="mt-1 font-brand text-lg font-semibold tracking-tight">
                ประวัติเส้นทาง
              </h1>
              <p className="mt-1 truncate text-[12px] text-muted-foreground">
                {selectedDevice
                  ? selectedDevice.employeeName || selectedDevice.deviceName
                  : "ยังไม่ได้เลือกพนักงาน"}
                {" · "}
                <span className="tabular-nums">{date}</span>
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HistoryIcon className="size-4" />
            </div>
          </div>
          {selectFields}
          {statsBlock}
        </div>

        {deviceId && (
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 cursor-pointer gap-1.5 rounded-full border-border/60 bg-card/90 shadow-sm backdrop-blur-md"
              onClick={() => setStopsOpen((v) => !v)}
            >
              <List className="size-3.5" />
              จุดหยุด
              {stops.length > 0 && (
                <span className="tabular-nums opacity-80">({stops.length})</span>
              )}
            </Button>
            {coverage && locations.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer gap-1.5 rounded-full border-border/60 bg-card/90 shadow-sm backdrop-blur-md"
                onClick={() => setShowCoverage((v) => !v)}
              >
                <Route className="size-3.5" />
                {showCoverage ? "ซ่อนพื้นที่" : "แสดงพื้นที่"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Empty / hint overlays */}
      {!deviceId && (
        <div className="pointer-events-none absolute inset-x-0 top-[40%] z-[1000] flex justify-center px-4 md:left-[420px]">
          <p className="rounded-2xl border border-border/60 bg-card/95 px-4 py-2.5 text-sm text-muted-foreground shadow-lg backdrop-blur-md">
            เลือกพนักงานเพื่อดูเส้นทางย้อนหลัง
          </p>
        </div>
      )}
      {deviceId && !loading && locations.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-[40%] z-[1000] flex justify-center px-4 md:left-[420px]">
          <p className="rounded-2xl border border-border/60 bg-card/95 px-4 py-2.5 text-center text-sm text-muted-foreground shadow-lg backdrop-blur-md">
            ไม่พบข้อมูลในวันที่ {date}
            {Object.keys(datesWithData).length === 0
              ? " — รอ backfill หรือ poll ก่อน"
              : ""}
          </p>
        </div>
      )}

      {/* Desktop stops drawer — leave room above the bottom playback scrubber */}
      {stopsOpen && deviceId && (
        <div className="pointer-events-none absolute bottom-[9.5rem] right-3 top-3 z-[1100] hidden w-[320px] md:block lg:bottom-[10.5rem]">
          <FadeIn className="pointer-events-auto glass-panel flex h-full max-h-full flex-col overflow-hidden rounded-[1.25rem]">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">จุดที่หยุด</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  รัศมี 60 ม. ≥ 5 นาที
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer rounded-full"
                onClick={() => setStopsOpen(false)}
                aria-label="ปิดรายการหยุด"
              >
                <X className="size-4" />
              </Button>
            </div>
            {stopsList}
          </FadeIn>
        </div>
      )}

      {/* Mobile stops sheet */}
      {stopsOpen && deviceId && (
        <div className="fixed inset-0 z-[1150] md:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-[var(--scrim)]"
            aria-label="ปิดจุดหยุด"
            onClick={() => setStopsOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[min(70dvh,560px)] flex-col overflow-hidden rounded-t-[1.5rem] border-t border-border/70 bg-card shadow-2xl"
            style={{
              paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">จุดที่หยุด</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  รัศมี 60 ม. ≥ 5 นาที
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer rounded-full"
                onClick={() => setStopsOpen(false)}
                aria-label="ปิด"
              >
                <X className="size-4" />
              </Button>
            </div>
            {stopsList}
          </div>
        </div>
      )}

      {/* Playback scrubber — inset from stops drawer when open */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-2 bottom-2 z-[1100] flex justify-center sm:inset-x-3 sm:bottom-3 md:left-[408px] md:justify-start",
          stopsOpen ? "md:right-[348px]" : "md:right-3"
        )}
      >
        <FadeIn className="pointer-events-auto w-full max-w-2xl">
          <div className="glass-panel rounded-2xl px-3 py-2.5 sm:rounded-[1.25rem] sm:px-4 sm:py-3.5">
            {locations.length > 0 && currentPoint ? (
              <>
                <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2">
                  <p className="min-w-0 truncate text-[12px] tabular-nums text-muted-foreground">
                    จุดที่{" "}
                    <span className="font-semibold text-foreground">
                      {sliderIndex + 1}
                    </span>{" "}
                    / {locations.length}
                    {sliderIndex === locations.length - 1 && (
                      <span className="ml-1.5 text-[11px] font-medium text-primary">
                        · ล่าสุด
                      </span>
                    )}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <p className="hidden text-[12px] tabular-nums text-muted-foreground sm:block">
                      {formatDateTime(currentPoint.recordedAt)}
                    </p>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-7 cursor-pointer rounded-lg md:hidden"
                      onClick={() => setScrubDetailsOpen((v) => !v)}
                      aria-expanded={scrubDetailsOpen}
                      aria-label="รายละเอียดจุด"
                    >
                      {scrubDetailsOpen ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronUp className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="mb-1.5 text-[11px] tabular-nums text-muted-foreground sm:hidden">
                  {formatDateTime(currentPoint.recordedAt)}
                  {speedKmh ? ` · ${speedKmh} km/h` : ""}
                </p>
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
                <div
                  className={cn(
                    "mt-2.5 space-y-2.5",
                    scrubDetailsOpen ? "block" : "hidden",
                    "md:mt-3 md:block md:space-y-3"
                  )}
                >
                  <dl className="grid grid-cols-3 gap-1.5 sm:gap-3">
                    <div className="rounded-xl bg-muted/60 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <dt className="text-[10px] text-muted-foreground">Lat</dt>
                      <dd className="mt-0.5 truncate text-[11px] font-semibold tabular-nums sm:text-[12px]">
                        {currentPoint.latitude.toFixed(5)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-muted/60 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <dt className="text-[10px] text-muted-foreground">Lng</dt>
                      <dd className="mt-0.5 truncate text-[11px] font-semibold tabular-nums sm:text-[12px]">
                        {currentPoint.longitude.toFixed(5)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-muted/60 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <dt className="text-[10px] text-muted-foreground">
                        ความเร็ว
                      </dt>
                      <dd className="mt-0.5 text-[11px] font-semibold tabular-nums sm:text-[12px]">
                        {speedKmh ? `${speedKmh} km/h` : "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 cursor-pointer gap-1.5 rounded-xl sm:flex-none"
                      render={
                        <a
                          href={googleMapsViewUrl(
                            currentPoint.latitude,
                            currentPoint.longitude
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <MapPinned className="size-3.5" />
                      พิกัด
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 flex-1 cursor-pointer gap-1.5 rounded-xl sm:flex-none"
                      render={
                        <a
                          href={googleMapsNavUrl(
                            currentPoint.latitude,
                            currentPoint.longitude
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <Navigation className="size-3.5" />
                      นำทาง
                    </Button>
                  </div>
                </div>
                {/* Always-visible compact actions on mobile when details collapsed */}
                {!scrubDetailsOpen && (
                  <div className="mt-2 flex gap-2 md:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 cursor-pointer gap-1.5 rounded-xl"
                      render={
                        <a
                          href={googleMapsViewUrl(
                            currentPoint.latitude,
                            currentPoint.longitude
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <MapPinned className="size-3.5" />
                      พิกัด
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 flex-1 cursor-pointer gap-1.5 rounded-xl"
                      render={
                        <a
                          href={googleMapsNavUrl(
                            currentPoint.latitude,
                            currentPoint.longitude
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <Navigation className="size-3.5" />
                      นำทาง
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="py-2 text-center text-[12px] text-muted-foreground">
                {deviceId
                  ? loading
                    ? "กำลังโหลดจุด..."
                    : "โหลดเส้นทางเพื่อเลื่อนดูจุด"
                  : "เลือกพนักงานแล้วโหลดเส้นทาง"}
              </p>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

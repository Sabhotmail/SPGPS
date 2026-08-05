"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  HistoryLocation,
  StopPoint,
  formatDateTime,
  formatDurationMinutes,
  googleMapsNavUrl,
} from "@/lib/types";
import "leaflet/dist/leaflet.css";

const highlightIcon = L.divIcon({
  className: "spgps-map-icon",
  html: `<div style="background:#171717;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function stopIcon(index: number, active: boolean) {
  const size = active ? 26 : 22;
  const bg = active ? "#171717" : "#fff";
  const fg = active ? "#fff" : "#171717";
  const border = active ? "2px solid #fff" : "2px solid #171717";
  return L.divIcon({
    className: "spgps-map-icon",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:${border};box-shadow:0 1px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font:600 11px/1 system-ui,sans-serif;color:${fg}">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapsNavLink({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <a
      href={googleMapsNavUrl(latitude, longitude)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      นำทางด้วย Google Maps
    </a>
  );
}

/** Leaflet must recalc size when flex layout / side panels change. */
function InvalidateSize({ layoutKey }: { layoutKey: string }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const refresh = () => {
      map.invalidateSize({ animate: false });
    };

    // Double-rAF waits for browser layout after side panel / bottom bar mount.
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(refresh);
    });

    const timers = [0, 50, 150, 400].map((ms) =>
      window.setTimeout(refresh, ms)
    );

    const ro = new ResizeObserver(() => refresh());
    ro.observe(container);
    let el: HTMLElement | null = container.parentElement;
    for (let i = 0; i < 4 && el; i++) {
      ro.observe(el);
      el = el.parentElement;
    }

    window.addEventListener("resize", refresh);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      timers.forEach((t) => window.clearTimeout(t));
      ro.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, [map, layoutKey]);

  return null;
}

function FitRoute({
  locations,
  layoutKey,
}: {
  locations: HistoryLocation[];
  layoutKey: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;
    const points = locations.map(
      (l) => [l.latitude, l.longitude] as [number, number]
    );

    const run = () => {
      map.invalidateSize({ animate: false });
      map.fitBounds(points, { padding: [48, 48], maxZoom: 15 });
    };

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(run);
    });
    const timers = [80, 200, 450].map((ms) => window.setTimeout(run, ms));

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [locations, map, layoutKey]);

  return null;
}

function PanToStop({ stop }: { stop: StopPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!stop) return;
    map.invalidateSize({ animate: false });
    map.panTo([stop.latitude, stop.longitude], { animate: true });
  }, [stop, map]);
  return null;
}

function StopMarker({
  stop,
  index,
  active,
  onSelect,
}: {
  stop: StopPoint;
  index: number;
  active: boolean;
  onSelect?: (stop: StopPoint) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (active) marker.openPopup();
  }, [active]);

  return (
    <Marker
      ref={markerRef}
      position={[stop.latitude, stop.longitude]}
      icon={stopIcon(index, active)}
      eventHandlers={{
        click: () => onSelect?.(stop),
      }}
    >
      <Popup>
        <div className="min-w-[200px] space-y-2">
          <div>
            <p className="font-medium">จุดหยุด #{index + 1}</p>
            <p className="text-xs text-muted-foreground">
              {formatDurationMinutes(stop.durationMinutes)} · {stop.pointCount}{" "}
              จุด
            </p>
          </div>
          <div className="space-y-0.5 text-xs tabular-nums text-muted-foreground">
            <p>เริ่ม {formatDateTime(stop.startAt)}</p>
            <p>ถึง {formatDateTime(stop.endAt)}</p>
            <p>
              {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
            </p>
          </div>
          <MapsNavLink latitude={stop.latitude} longitude={stop.longitude} />
        </div>
      </Popup>
    </Marker>
  );
}

function HighlightMarker({
  point,
  index,
  total,
  speedLabel,
  autoOpen,
}: {
  point: HistoryLocation;
  index: number;
  total: number;
  speedLabel?: string | null;
  autoOpen: boolean;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (autoOpen) marker.openPopup();
    else marker.closePopup();
  }, [point.id, index, autoOpen]);

  return (
    <Marker
      ref={markerRef}
      position={[point.latitude, point.longitude]}
      icon={highlightIcon}
      zIndexOffset={500}
    >
      <Popup>
        <div className="min-w-[200px] space-y-2">
          <div>
            <p className="font-medium">
              จุดที่ {index + 1} / {total}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatDateTime(point.recordedAt)}
            </p>
          </div>
          <div className="space-y-0.5 text-xs tabular-nums text-muted-foreground">
            <p>
              Lat {point.latitude.toFixed(5)} · Lng {point.longitude.toFixed(5)}
            </p>
            {point.accuracy != null && <p>ความแม่นยำ ±{point.accuracy} ม.</p>}
            <p>ความเร็ว {speedLabel ? `${speedLabel} km/h` : "—"}</p>
          </div>
          <MapsNavLink latitude={point.latitude} longitude={point.longitude} />
        </div>
      </Popup>
    </Marker>
  );
}

type Props = {
  locations: HistoryLocation[];
  highlightIndex: number;
  stops?: StopPoint[];
  selectedStopId?: string | null;
  onSelectStop?: (stop: StopPoint) => void;
  speedLabel?: string | null;
  /** Bump when surrounding chrome (stop list / slider) mounts or resizes. */
  layoutKey?: string;
};

export function HistoryMap({
  locations,
  highlightIndex,
  stops = [],
  selectedStopId,
  onSelectStop,
  speedLabel,
  layoutKey = "default",
}: Props) {
  const defaultCenter: [number, number] = [13.7563, 100.5018];
  const polyline = locations.map(
    (l) => [l.latitude, l.longitude] as [number, number]
  );
  const highlight = locations[highlightIndex];
  const selectedStop = stops.find((s) => s.id === selectedStopId) ?? null;
  const mapKey =
    locations.length > 0
      ? `${locations[0]!.id}-${locations.length}`
      : "empty";
  const sizeKey = `${layoutKey}:${mapKey}:stops=${stops.length}`;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        key={mapKey}
        center={defaultCenter}
        zoom={11}
        className="h-full w-full"
        style={{ height: "100%", width: "100%", background: "#fff" }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <InvalidateSize layoutKey={sizeKey} />
        {locations.length > 0 && (
          <FitRoute locations={locations} layoutKey={sizeKey} />
        )}
        <PanToStop stop={selectedStop} />
        {polyline.length > 1 && (
          <Polyline
            positions={polyline}
            pathOptions={{ color: "#171717", weight: 3, opacity: 0.75 }}
          />
        )}
        {stops.map((stop, index) => (
          <StopMarker
            key={stop.id}
            stop={stop}
            index={index}
            active={stop.id === selectedStopId}
            onSelect={onSelectStop}
          />
        ))}
        {highlight && (
          <HighlightMarker
            point={highlight}
            index={highlightIndex}
            total={locations.length}
            speedLabel={speedLabel}
            autoOpen={!selectedStopId}
          />
        )}
      </MapContainer>
    </div>
  );
}

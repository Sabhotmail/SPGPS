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

const startIcon = L.divIcon({
  className: "spgps-map-icon",
  html: `<div style="background:#fff;width:22px;height:22px;border-radius:50%;border:2px solid #171717;box-shadow:0 1px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font:700 9px/1 system-ui,sans-serif;color:#171717">เริ่ม</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const endIcon = L.divIcon({
  className: "spgps-map-icon",
  html: `<div style="background:#171717;width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font:700 9px/1 system-ui,sans-serif;color:#fff">ล่าสุด</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
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
  label = "นำทาง Google Maps",
}: {
  latitude: number;
  longitude: number;
  label?: string;
}) {
  return (
    <a
      href={googleMapsNavUrl(latitude, longitude)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
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
      <Popup className="spgps-device-popup" maxWidth={280} minWidth={220} offset={[0, -4]}>
        <div className="spgps-popup">
          <div className="spgps-popup-head">
            <p className="spgps-popup-title">จุดหยุด #{index + 1}</p>
            <p className="spgps-popup-sub">
              {formatDurationMinutes(stop.durationMinutes)} · {stop.pointCount}{" "}
              จุด
            </p>
          </div>
          <dl className="spgps-popup-meta">
            <div>
              <dt>เริ่ม</dt>
              <dd className="tabular-nums">{formatDateTime(stop.startAt)}</dd>
            </div>
            <div>
              <dt>ถึง</dt>
              <dd className="tabular-nums">{formatDateTime(stop.endAt)}</dd>
            </div>
            <div>
              <dt>พิกัด</dt>
              <dd className="tabular-nums">
                {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
              </dd>
            </div>
          </dl>
          <div className="spgps-popup-actions">
            <MapsNavLink latitude={stop.latitude} longitude={stop.longitude} />
          </div>
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
  isLatest,
}: {
  point: HistoryLocation;
  index: number;
  total: number;
  speedLabel?: string | null;
  autoOpen: boolean;
  isLatest?: boolean;
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
      icon={isLatest ? endIcon : highlightIcon}
      zIndexOffset={500}
    >
      <Popup className="spgps-device-popup" maxWidth={280} minWidth={220} offset={[0, -4]}>
        <div className="spgps-popup">
          <div className="spgps-popup-head">
            <p className="spgps-popup-title">
              {isLatest
                ? `จุดล่าสุด · ${index + 1}/${total}`
                : `จุดที่ ${index + 1} / ${total}`}
            </p>
            <p className="spgps-popup-sub tabular-nums">
              {formatDateTime(point.recordedAt)}
            </p>
          </div>
          <dl className="spgps-popup-meta">
            <div>
              <dt>พิกัด</dt>
              <dd className="tabular-nums">
                {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
              </dd>
            </div>
            {point.accuracy != null && (
              <div>
                <dt>แม่นยำ</dt>
                <dd>±{point.accuracy} ม.</dd>
              </div>
            )}
            <div>
              <dt>ความเร็ว</dt>
              <dd className="tabular-nums">
                {speedLabel ? `${speedLabel} km/h` : "—"}
              </dd>
            </div>
          </dl>
          <div className="spgps-popup-actions">
            <MapsNavLink
              latitude={point.latitude}
              longitude={point.longitude}
            />
          </div>
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
  const startPoint = locations[0] ?? null;
  const endPoint =
    locations.length > 0 ? locations[locations.length - 1]! : null;
  const showStart =
    startPoint != null && locations.length > 1 && highlightIndex !== 0;
  const showEnd =
    endPoint != null &&
    locations.length > 0 &&
    highlightIndex !== locations.length - 1;
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
        {showStart && startPoint && (
          <Marker
            position={[startPoint.latitude, startPoint.longitude]}
            icon={startIcon}
            zIndexOffset={200}
          >
            <Popup
              className="spgps-device-popup"
              maxWidth={280}
              minWidth={220}
              offset={[0, -4]}
            >
              <div className="spgps-popup">
                <div className="spgps-popup-head">
                  <p className="spgps-popup-title">จุดเริ่มต้น</p>
                  <p className="spgps-popup-sub tabular-nums">
                    {formatDateTime(startPoint.recordedAt)}
                  </p>
                </div>
                <div className="spgps-popup-actions">
                  <MapsNavLink
                    latitude={startPoint.latitude}
                    longitude={startPoint.longitude}
                  />
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        {showEnd && endPoint && (
          <Marker
            position={[endPoint.latitude, endPoint.longitude]}
            icon={endIcon}
            zIndexOffset={300}
          >
            <Popup
              className="spgps-device-popup"
              maxWidth={280}
              minWidth={220}
              offset={[0, -4]}
            >
              <div className="spgps-popup">
                <div className="spgps-popup-head">
                  <p className="spgps-popup-title">จุดล่าสุด</p>
                  <p className="spgps-popup-sub tabular-nums">
                    {formatDateTime(endPoint.recordedAt)}
                  </p>
                </div>
                <dl className="spgps-popup-meta">
                  <div>
                    <dt>พิกัด</dt>
                    <dd className="tabular-nums">
                      {endPoint.latitude.toFixed(5)},{" "}
                      {endPoint.longitude.toFixed(5)}
                    </dd>
                  </div>
                </dl>
                <div className="spgps-popup-actions">
                  <MapsNavLink
                    latitude={endPoint.latitude}
                    longitude={endPoint.longitude}
                  />
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        {highlight && (
          <HighlightMarker
            point={highlight}
            index={highlightIndex}
            total={locations.length}
            speedLabel={speedLabel}
            autoOpen={!selectedStopId}
            isLatest={highlightIndex === locations.length - 1}
          />
        )}
      </MapContainer>
    </div>
  );
}

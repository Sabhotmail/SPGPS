"use client";

import L from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import { HistoryLocation, StopPoint } from "@/lib/types";
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

/** Leaflet must recalc size when flex layout / side panels change. */
function InvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const refresh = () => {
      map.invalidateSize({ animate: false });
    };

    refresh();
    const t1 = window.setTimeout(refresh, 50);
    const t2 = window.setTimeout(refresh, 250);

    const ro = new ResizeObserver(() => refresh());
    ro.observe(container);
    if (container.parentElement) ro.observe(container.parentElement);

    window.addEventListener("resize", refresh);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, [map]);

  return null;
}

function FitRoute({ locations }: { locations: HistoryLocation[] }) {
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

    run();
    const t = window.setTimeout(run, 100);
    return () => window.clearTimeout(t);
  }, [locations, map]);

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

type Props = {
  locations: HistoryLocation[];
  highlightIndex: number;
  stops?: StopPoint[];
  selectedStopId?: string | null;
  onSelectStop?: (stop: StopPoint) => void;
};

export function HistoryMap({
  locations,
  highlightIndex,
  stops = [],
  selectedStopId,
  onSelectStop,
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

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        key={mapKey}
        center={defaultCenter}
        zoom={11}
        className="h-full w-full"
        style={{ height: "100%", width: "100%", background: "#f4f4f5" }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <InvalidateSize />
        {locations.length > 0 && <FitRoute locations={locations} />}
        <PanToStop stop={selectedStop} />
        {polyline.length > 1 && (
          <Polyline
            positions={polyline}
            pathOptions={{ color: "#171717", weight: 3, opacity: 0.75 }}
          />
        )}
        {stops.map((stop, index) => (
          <Marker
            key={stop.id}
            position={[stop.latitude, stop.longitude]}
            icon={stopIcon(index, stop.id === selectedStopId)}
            eventHandlers={{
              click: () => onSelectStop?.(stop),
            }}
          />
        ))}
        {highlight && (
          <Marker
            position={[highlight.latitude, highlight.longitude]}
            icon={highlightIcon}
            zIndexOffset={500}
          />
        )}
      </MapContainer>
    </div>
  );
}

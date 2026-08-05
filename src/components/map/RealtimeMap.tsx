"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import Link from "next/link";
import {
  DeviceLocation,
  formatBattery,
  formatConnectionStatus,
  formatDateTime,
  getDeviceStatus,
  googleMapsNavUrl,
  statusColor,
} from "@/lib/types";
import { StatusDot } from "@/components/ui/status-dot";
import "leaflet/dist/leaflet.css";

function createIcon(color: string, active: boolean) {
  const size = active ? 18 : 14;
  return L.divIcon({
    className: "spgps-map-icon",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:${active ? 3 : 2}px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function titleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function deviceModelLabel(d: DeviceLocation): string | null {
  const parts = [d.make ? titleCase(d.make) : null, d.model].filter(Boolean);
  if (parts.length === 0) return null;
  const base = parts.join(" ");
  return d.osVersion ? `${base} · Android ${d.osVersion}` : base;
}

function FitBounds({ devices }: { devices: DeviceLocation[] }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    const points = devices
      .filter((d) => d.latestLocation)
      .map(
        (d) =>
          [d.latestLocation!.latitude, d.latestLocation!.longitude] as [
            number,
            number,
          ]
      );

    if (points.length === 0) return;

    if (!initialized.current) {
      map.invalidateSize({ animate: false });
      map.fitBounds(points, { padding: [48, 48], maxZoom: 14 });
      initialized.current = true;
    }
  }, [devices, map]);

  return null;
}

/** Keep Leaflet in sync when the map pane is height-locked (no page scroll). */
function InvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const refresh = () => map.invalidateSize({ animate: false });

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(refresh);
    });
    const timers = [50, 200, 400].map((ms) => window.setTimeout(refresh, ms));

    const ro = new ResizeObserver(() => refresh());
    ro.observe(container);
    if (container.parentElement) ro.observe(container.parentElement);

    window.addEventListener("resize", refresh);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      timers.forEach((t) => window.clearTimeout(t));
      ro.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, [map]);

  return null;
}

function FocusSelected({
  selectedDeviceId,
  devices,
}: {
  selectedDeviceId: string | null;
  devices: DeviceLocation[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedDeviceId) return;
    const device = devices.find((d) => d.id === selectedDeviceId);
    if (!device?.latestLocation) return;
    map.flyTo(
      [device.latestLocation.latitude, device.latestLocation.longitude],
      Math.max(map.getZoom(), 14),
      { duration: 0.6 }
    );
  }, [selectedDeviceId, devices, map]);

  return null;
}

function DeviceMarker({
  device,
  active,
  onSelect,
}: {
  device: DeviceLocation;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const status = getDeviceStatus(device.lastSeenAt);
  const loc = device.latestLocation!;
  const model = deviceModelLabel(device);
  const battery = formatBattery(
    device.batteryPercent,
    device.batteryCharging
  );
  const sfStatus = formatConnectionStatus(device.connectionStatus);
  const showDeviceName =
    device.deviceName &&
    device.deviceName.trim() !== device.employeeName.trim();
  const lowBattery =
    device.batteryPercent != null && device.batteryPercent <= 15;

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (active) marker.openPopup();
  }, [active]);

  return (
    <Marker
      ref={markerRef}
      position={[loc.latitude, loc.longitude]}
      icon={createIcon(statusColor(status), active)}
      eventHandlers={{ click: () => onSelect(device.id) }}
      zIndexOffset={active ? 1000 : 0}
    >
      <Popup className="spgps-device-popup" maxWidth={280} minWidth={220} offset={[0, -4]}>
        <div className="spgps-popup">
          <div className="spgps-popup-head">
            <p className="spgps-popup-title">{device.employeeName}</p>
            {showDeviceName && (
              <p className="spgps-popup-sub">{device.deviceName}</p>
            )}
            {model && <p className="spgps-popup-sub">{model}</p>}
          </div>

          <div className="spgps-popup-status">
            <StatusDot status={status} showLabel />
            {sfStatus && (
              <span className="spgps-popup-chip">SF {sfStatus}</span>
            )}
          </div>

          <dl className="spgps-popup-meta">
            {battery && (
              <div>
                <dt>แบต</dt>
                <dd className={lowBattery ? "spgps-popup-warn" : undefined}>
                  {battery}
                  {device.batteryHealth ? ` · ${device.batteryHealth}` : ""}
                </dd>
              </div>
            )}
            {device.sfGroupName && (
              <div>
                <dt>กลุ่ม</dt>
                <dd>{device.sfGroupName}</dd>
              </div>
            )}
            {(device.simNetwork || device.phoneNo) && (
              <div>
                <dt>เครือข่าย</dt>
                <dd>
                  {[device.simNetwork, device.phoneNo]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
            )}
            <div>
              <dt>อัปเดต</dt>
              <dd className="tabular-nums">
                {formatDateTime(loc.recordedAt)}
              </dd>
            </div>
          </dl>

          <div className="spgps-popup-actions">
            <a
              href={googleMapsNavUrl(loc.latitude, loc.longitude)}
              target="_blank"
              rel="noopener noreferrer"
            >
              นำทาง Google Maps
            </a>
            <Link href={`/history?deviceId=${device.id}`}>ดูประวัติ</Link>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

type Props = {
  devices: DeviceLocation[];
  selectedDeviceId: string | null;
  onSelectDevice: (id: string) => void;
};

export function RealtimeMap({
  devices,
  selectedDeviceId,
  onSelectDevice,
}: Props) {
  const defaultCenter: [number, number] = [13.7563, 100.5018];

  return (
    <div className="h-full w-full bg-background">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        className="h-full w-full bg-background"
        style={{ background: "#fff" }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds devices={devices} />
        <InvalidateSize />
        <FocusSelected selectedDeviceId={selectedDeviceId} devices={devices} />
        {devices.map((d) => {
          if (!d.latestLocation) return null;
          return (
            <DeviceMarker
              key={d.id}
              device={d}
              active={selectedDeviceId === d.id}
              onSelect={onSelectDevice}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}

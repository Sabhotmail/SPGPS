"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";
import Link from "next/link";
import {
  DeviceLocation,
  formatBattery,
  formatConnectionStatus,
  formatDateTime,
  getDeviceStatus,
  googleMapsNavUrl,
  googleMapsViewUrl,
  statusColor,
} from "@/lib/types";
import { StatusDot } from "@/components/ui/status-dot";
import { isMapAlive } from "@/lib/leaflet-alive";
import { ThemeTileLayer } from "@/components/map/ThemeTileLayer";
import "leaflet/dist/leaflet.css";

/** Status-only icon. Active state is toggled via CSS class — do not bake it
 * into the icon HTML or react-leaflet will setIcon on every selection and can
 * throw "_leaflet_pos" while the marker DOM is mid-update. */
function createIcon(color: string) {
  const hit = 28;
  return L.divIcon({
    className: "spgps-map-icon",
    html: `<div class="spgps-pin-hit"><span class="spgps-pin" style="background:${color}"></span></div>`,
    iconSize: [hit, hit],
    iconAnchor: [hit / 2, hit / 2],
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
      if (!isMapAlive(map)) return;
      try {
        map.invalidateSize({ animate: false });
        map.fitBounds(points, { padding: [48, 48], maxZoom: 14 });
        initialized.current = true;
      } catch {
        // Ignore Leaflet teardown races (_leaflet_pos).
      }
    }
  }, [devices, map]);

  return null;
}

/** Keep Leaflet in sync when the map pane is height-locked (no page scroll). */
function InvalidateSize() {
  const map = useMap();

  useEffect(() => {
    let container: HTMLElement;
    try {
      container = map.getContainer();
    } catch {
      return;
    }

    let debounceTimer = 0;
    const refreshNow = () => {
      if (!isMapAlive(map)) return;
      try {
        map.invalidateSize({ animate: false });
      } catch {
        // Ignore Leaflet teardown races (_leaflet_pos).
      }
    };
    // Debounce: sidebar width transitions + ResizeObserver otherwise spam
    // invalidateSize mid-layout and Leaflet can throw on missing _leaflet_pos.
    const refresh = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(refreshNow, 120);
    };

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(refreshNow);
    });
    const timers = [50, 250].map((ms) => window.setTimeout(refreshNow, ms));

    const ro = new ResizeObserver(() => refresh());
    // Observe only the map container — ancestor chains fire during sidebar
    // width transitions and are a common _leaflet_pos trigger.
    if (container.isConnected) ro.observe(container);

    window.addEventListener("resize", refresh);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(debounceTimer);
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
    if (!isMapAlive(map)) return;
    try {
      map.flyTo(
        [device.latestLocation.latitude, device.latestLocation.longitude],
        Math.max(map.getZoom(), 14),
        { duration: 0.6 }
      );
    } catch {
      // Ignore Leaflet teardown races (_leaflet_pos).
    }
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
  const icon = useMemo(() => createIcon(statusColor(status)), [status]);
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
    const apply = () => {
      const pin = marker.getElement()?.querySelector(".spgps-pin");
      pin?.classList.toggle("is-active", active);
    };
    apply();
    // Icon/status rebuild replaces the pin DOM — re-apply on next frame.
    const raf = window.requestAnimationFrame(apply);
    return () => window.cancelAnimationFrame(raf);
  }, [active, status, icon]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (active) marker.openPopup();
  }, [active]);

  return (
    <Marker
      ref={markerRef}
      position={[loc.latitude, loc.longitude]}
      icon={icon}
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
              href={googleMapsViewUrl(loc.latitude, loc.longitude)}
              target="_blank"
              rel="noopener noreferrer"
            >
              เปิดพิกัด
            </a>
            <a
              href={googleMapsNavUrl(loc.latitude, loc.longitude)}
              target="_blank"
              rel="noopener noreferrer"
            >
              นำทาง
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
    <div className="h-full w-full bg-muted">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <ThemeTileLayer />
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

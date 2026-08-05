"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import Link from "next/link";
import {
  DeviceLocation,
  formatDateTime,
  getDeviceStatus,
  statusColor,
} from "@/lib/types";
import { StatusDot } from "@/components/ui/status-dot";
import "leaflet/dist/leaflet.css";

function createIcon(color: string, active: boolean) {
  const size = active ? 18 : 14;
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:${active ? 3 : 2}px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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
      map.fitBounds(points, { padding: [48, 48], maxZoom: 14 });
      initialized.current = true;
    }
  }, [devices, map]);

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
    <div className="h-full w-full">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds devices={devices} />
        <FocusSelected selectedDeviceId={selectedDeviceId} devices={devices} />
        {devices.map((d) => {
          if (!d.latestLocation) return null;
          const status = getDeviceStatus(d.lastSeenAt);
          const active = selectedDeviceId === d.id;
          return (
            <Marker
              key={d.id}
              position={[d.latestLocation.latitude, d.latestLocation.longitude]}
              icon={createIcon(statusColor(status), active)}
              eventHandlers={{ click: () => onSelectDevice(d.id) }}
              zIndexOffset={active ? 1000 : 0}
            >
              <Popup>
                <div className="min-w-[180px] space-y-2">
                  <div>
                    <p className="font-medium">{d.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{d.deviceName}</p>
                  </div>
                  <StatusDot status={status} showLabel />
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(d.latestLocation.recordedAt)}
                  </p>
                  <Link
                    href={`/history?deviceId=${d.id}`}
                    className="inline-block text-xs font-medium text-primary"
                  >
                    ดูประวัติ
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

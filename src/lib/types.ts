export type DeviceLocation = {
  id: string;
  scalefusionDeviceId: string;
  deviceName: string;
  employeeName: string;
  lastSeenAt: string | null;
  make: string | null;
  model: string | null;
  osVersion: string | null;
  connectionStatus: string | null;
  batteryPercent: number | null;
  batteryCharging: boolean | null;
  batteryHealth: string | null;
  phoneNo: string | null;
  simNetwork: string | null;
  sfGroupName: string | null;
  licenseActive: boolean | null;
  licenseExpiresAt: string | null;
  detailsFetchedAt: string | null;
  groups: { id: string; name: string }[];
  latestLocation: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    recordedAt: string;
  } | null;
};

export type HistoryLocation = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
};

export function getDeviceStatus(lastSeenAt: string | null): "online" | "idle" | "offline" {
  if (!lastSeenAt) return "offline";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  const minutes = diff / 60000;
  if (minutes < 10) return "online";
  if (minutes < 60) return "idle";
  return "offline";
}

export function statusColor(status: "online" | "idle" | "offline"): string {
  switch (status) {
    case "online":
      return "#0d9488";
    case "idle":
      return "#d97706";
    case "offline":
      return "#94a3b8";
  }
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH");
}

export function formatBattery(
  percent: number | null | undefined,
  charging?: boolean | null
): string | null {
  if (percent == null) return null;
  const base = `${percent}%`;
  return charging ? `${base} ⚡` : base;
}

export function formatConnectionStatus(
  status: string | null | undefined
): string | null {
  if (!status) return null;
  const s = status.trim().toLowerCase();
  if (s === "online") return "Online";
  if (s === "offline") return "Offline";
  return status;
}

/** Open Google Maps centered on a lat/lng pin. */
export function googleMapsViewUrl(latitude: number, longitude: number): string {
  const q = `${latitude},${longitude}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
}

/** Google Maps directions to a lat/lng destination. */
export function googleMapsNavUrl(latitude: number, longitude: number): string {
  const dest = `${latitude},${longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return haversineKm(lat1, lon1, lat2, lon2) * 1000;
}

export type StopPoint = {
  id: string;
  latitude: number;
  longitude: number;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  pointCount: number;
  startIndex: number;
  endIndex: number;
};

/**
 * Detect places where the device stayed roughly still.
 * A stop = consecutive points within `radiusMeters` of the cluster center
 * lasting at least `minDurationMinutes`.
 */
export function detectStops(
  locations: HistoryLocation[],
  options?: {
    radiusMeters?: number;
    minDurationMinutes?: number;
  }
): StopPoint[] {
  const radiusMeters = options?.radiusMeters ?? 60;
  const minDurationMinutes = options?.minDurationMinutes ?? 5;

  if (locations.length < 2) return [];

  const stops: StopPoint[] = [];
  let i = 0;

  while (i < locations.length) {
    const start = i;
    let sumLat = locations[i]!.latitude;
    let sumLng = locations[i]!.longitude;
    let count = 1;
    let j = i + 1;

    while (j < locations.length) {
      const centerLat = sumLat / count;
      const centerLng = sumLng / count;
      const next = locations[j]!;
      const dist = haversineMeters(
        centerLat,
        centerLng,
        next.latitude,
        next.longitude
      );
      if (dist > radiusMeters) break;
      sumLat += next.latitude;
      sumLng += next.longitude;
      count++;
      j++;
    }

    const end = j - 1;
    const startAt = locations[start]!.recordedAt;
    const endAt = locations[end]!.recordedAt;
    const durationMinutes =
      (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000;

    if (end > start && durationMinutes >= minDurationMinutes) {
      stops.push({
        id: `${start}-${end}`,
        latitude: sumLat / count,
        longitude: sumLng / count,
        startAt,
        endAt,
        durationMinutes,
        pointCount: count,
        startIndex: start,
        endIndex: end,
      });
    }

    // Advance past this cluster (or single moving point)
    i = Math.max(j, i + 1);
  }

  return stops;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 1) return "< 1 นาที";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} นาที`;
  if (m === 0) return `${h} ชม.`;
  return `${h} ชม. ${m} นาที`;
}

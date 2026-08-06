import type { HistoryLocation } from "@/lib/types";
import { haversineKm } from "@/lib/types";

export type SpeedSegment = {
  positions: [number, number][];
  color: string;
  speedKmh: number | null;
};

/** Speed between two consecutive GPS points (km/h). */
export function segmentSpeedKmh(
  from: Pick<HistoryLocation, "latitude" | "longitude" | "recordedAt">,
  to: Pick<HistoryLocation, "latitude" | "longitude" | "recordedAt">
): number | null {
  const hours =
    (new Date(to.recordedAt).getTime() - new Date(from.recordedAt).getTime()) /
    3_600_000;
  if (hours <= 0) return null;

  const distKm = haversineKm(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude
  );
  const speed = distKm / hours;
  if (!Number.isFinite(speed) || speed > 150) return null;
  return speed;
}

/** Map speed to a route color (slow → fast). */
export function speedColorKmh(speed: number | null): string {
  if (speed == null) return "#94a3b8";
  if (speed < 3) return "#64748b";
  if (speed < 15) return "#f97316";
  if (speed < 30) return "#eab308";
  if (speed < 50) return "#22c55e";
  return "#0d9488";
}

export function formatSpeedKmh(speed: number | null): string | null {
  if (speed == null) return null;
  return speed.toFixed(1);
}

/** Merge consecutive segments that share the same color bucket. */
export function buildSpeedSegments(
  locations: HistoryLocation[]
): SpeedSegment[] {
  if (locations.length < 2) return [];

  const segments: SpeedSegment[] = [];
  let current: SpeedSegment | null = null;

  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i - 1]!;
    const curr = locations[i]!;
    const speed = segmentSpeedKmh(prev, curr);
    const color = speedColorKmh(speed);
    const from: [number, number] = [prev.latitude, prev.longitude];
    const to: [number, number] = [curr.latitude, curr.longitude];

    if (current && current.color === color) {
      current.positions.push(to);
      current.speedKmh = speed;
    } else {
      if (current) segments.push(current);
      current = { positions: [from, to], color, speedKmh: speed };
    }
  }

  if (current) segments.push(current);
  return segments;
}

export const SPEED_LEGEND = [
  { label: "หยุด", color: "#64748b", maxKmh: 3 },
  { label: "< 15", color: "#f97316", maxKmh: 15 },
  { label: "15–30", color: "#eab308", maxKmh: 30 },
  { label: "30–50", color: "#22c55e", maxKmh: 50 },
  { label: "> 50", color: "#0d9488", maxKmh: null },
] as const;

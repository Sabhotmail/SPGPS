import type { HistoryLocation } from "@/lib/types";

const DEFAULT_BUFFER_METERS = 50;
const DEFAULT_CELL_SIZE_METERS = 25;

export type CoverageResult = {
  areaSqMeters: number;
  cellCount: number;
  bufferMeters: number;
  cellSizeMeters: number;
  refLat: number;
  refLng: number;
  cells: { ix: number; iy: number }[];
};

type LatLng = { latitude: number; longitude: number };

function latLngToMeters(
  lat: number,
  lng: number,
  refLat: number,
  refLng: number
): { x: number; y: number } {
  const latRad = (refLat * Math.PI) / 180;
  return {
    x: (lng - refLng) * Math.cos(latRad) * 111_320,
    y: (lat - refLat) * 111_320,
  };
}

function metersToLatLng(
  x: number,
  y: number,
  refLat: number,
  refLng: number
): { lat: number; lng: number } {
  const latRad = (refLat * Math.PI) / 180;
  return {
    lat: refLat + y / 111_320,
    lng: refLng + x / (Math.cos(latRad) * 111_320),
  };
}

/**
 * Estimate daily covered area as unique grid cells within `bufferMeters`
 * of the traveled path (field-work style corridor coverage).
 */
export function computeCoverageArea(
  locations: LatLng[],
  options?: {
    bufferMeters?: number;
    cellSizeMeters?: number;
  }
): CoverageResult | null {
  if (locations.length === 0) return null;

  const bufferMeters = options?.bufferMeters ?? DEFAULT_BUFFER_METERS;
  const cellSizeMeters = options?.cellSizeMeters ?? DEFAULT_CELL_SIZE_METERS;
  const halfDiagonal = (cellSizeMeters * Math.SQRT2) / 2;
  const reach = bufferMeters + halfDiagonal;
  const gridRadius = Math.ceil(reach / cellSizeMeters);

  const refLat =
    locations.reduce((sum, l) => sum + l.latitude, 0) / locations.length;
  const refLng =
    locations.reduce((sum, l) => sum + l.longitude, 0) / locations.length;

  const cellKeys = new Set<string>();
  const cells: { ix: number; iy: number }[] = [];

  for (const loc of locations) {
    const { x, y } = latLngToMeters(
      loc.latitude,
      loc.longitude,
      refLat,
      refLng
    );
    const baseIx = Math.floor(x / cellSizeMeters);
    const baseIy = Math.floor(y / cellSizeMeters);

    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        const ix = baseIx + dx;
        const iy = baseIy + dy;
        const cx = (ix + 0.5) * cellSizeMeters;
        const cy = (iy + 0.5) * cellSizeMeters;
        const dist = Math.hypot(cx - x, cy - y);
        if (dist > reach) continue;

        const key = `${ix},${iy}`;
        if (cellKeys.has(key)) continue;
        cellKeys.add(key);
        cells.push({ ix, iy });
      }
    }
  }

  return {
    areaSqMeters: cells.length * cellSizeMeters * cellSizeMeters,
    cellCount: cells.length,
    bufferMeters,
    cellSizeMeters,
    refLat,
    refLng,
    cells,
  };
}

export function formatCoverageArea(sqMeters: number): string {
  const rai = sqMeters / 1600;
  if (rai >= 0.1) {
    return `${rai.toFixed(2)} ไร่`;
  }
  if (sqMeters >= 10_000) {
    return `${(sqMeters / 1_000_000).toFixed(3)} ตร.กม.`;
  }
  return `${Math.round(sqMeters)} ตร.ม.`;
}

/** GeoJSON for map overlay (may merge cells when there are too many). */
export function coverageToDisplayGeoJson(
  coverage: CoverageResult,
  maxCells = 600
): {
  type: "Feature";
  properties: { areaSqMeters: number; bufferMeters: number };
  geometry: {
    type: "MultiPolygon";
    coordinates: [number, number][][][];
  };
} {
  let { cells, refLat, refLng, cellSizeMeters } = coverage;

  if (cells.length > maxCells) {
    const merge = Math.max(
      2,
      Math.ceil(Math.sqrt(cells.length / maxCells))
    );
    const merged = new Map<string, { ix: number; iy: number }>();
    for (const { ix, iy } of cells) {
      const mix = Math.floor(ix / merge);
      const miy = Math.floor(iy / merge);
      merged.set(`${mix},${miy}`, { ix: mix, iy: miy });
    }
    cells = Array.from(merged.values());
    cellSizeMeters *= merge;
  }

  const half = cellSizeMeters / 2;
  const coordinates = cells.map(({ ix, iy }) => {
    const cx = ix * cellSizeMeters + half;
    const cy = iy * cellSizeMeters + half;
    const corners = [
      { x: cx - half, y: cy - half },
      { x: cx + half, y: cy - half },
      { x: cx + half, y: cy + half },
      { x: cx - half, y: cy + half },
      { x: cx - half, y: cy - half },
    ].map(({ x, y }) => {
      const { lat, lng } = metersToLatLng(x, y, refLat, refLng);
      return [lng, lat] as [number, number];
    });
    return [corners];
  });

  return {
    type: "Feature",
    properties: {
      areaSqMeters: coverage.areaSqMeters,
      bufferMeters: coverage.bufferMeters,
    },
    geometry: {
      type: "MultiPolygon",
      coordinates,
    },
  };
}

/** GeoJSON Feature (MultiPolygon) for Leaflet overlay. */
export function coverageToGeoJson(coverage: CoverageResult): {
  type: "Feature";
  properties: { areaSqMeters: number; bufferMeters: number };
  geometry: {
    type: "MultiPolygon";
    coordinates: [number, number][][][];
  };
} {
  const { cells, refLat, refLng, cellSizeMeters } = coverage;
  const half = cellSizeMeters / 2;

  const coordinates = cells.map(({ ix, iy }) => {
    const cx = ix * cellSizeMeters + half;
    const cy = iy * cellSizeMeters + half;
    const corners = [
      { x: cx - half, y: cy - half },
      { x: cx + half, y: cy - half },
      { x: cx + half, y: cy + half },
      { x: cx - half, y: cy + half },
      { x: cx - half, y: cy - half },
    ].map(({ x, y }) => {
      const { lat, lng } = metersToLatLng(x, y, refLat, refLng);
      return [lng, lat] as [number, number];
    });
    return [corners];
  });

  return {
    type: "Feature",
    properties: {
      areaSqMeters: coverage.areaSqMeters,
      bufferMeters: coverage.bufferMeters,
    },
    geometry: {
      type: "MultiPolygon",
      coordinates,
    },
  };
}

export function computeHistoryCoverage(
  locations: HistoryLocation[],
  options?: {
    bufferMeters?: number;
    cellSizeMeters?: number;
  }
): CoverageResult | null {
  return computeCoverageArea(locations, options);
}

/** Shared Leaflet basemap — OSM by default (no API key). Dark mode restyles tiles in CSS. */

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Optional Esri dark basemap (no key for light usage). Used when available via env. */
export const MAP_TILE_DARK_ESRI =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";

export const MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() || OSM_URL;

export const MAP_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() || OSM_ATTR;

export function getMapTiles(dark: boolean): {
  url: string;
  attribution: string;
  /** When true, ThemeTileLayer relies on CSS invert (OSM) instead of a dark tile URL. */
  cssDarken: boolean;
} {
  const customDark = process.env.NEXT_PUBLIC_MAP_TILE_DARK_URL?.trim();
  const customLight = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim();

  if (dark && customDark) {
    return {
      url: customDark,
      attribution:
        process.env.NEXT_PUBLIC_MAP_TILE_DARK_ATTRIBUTION?.trim() ||
        process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() ||
        OSM_ATTR,
      cssDarken: false,
    };
  }

  if (dark) {
    // Prefer Esri dark gray (no key) over CARTO which now watermarks without a key.
    return {
      url: MAP_TILE_DARK_ESRI,
      attribution:
        "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
      cssDarken: false,
    };
  }

  return {
    url: customLight || OSM_URL,
    attribution:
      process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() || OSM_ATTR,
    cssDarken: false,
  };
}

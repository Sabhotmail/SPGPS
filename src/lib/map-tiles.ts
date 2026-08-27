/** Shared Leaflet basemap config (no third-party API key required). */
export const MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
